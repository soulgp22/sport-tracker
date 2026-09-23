#!/usr/bin/env python3
"""
lst_quota — quota journalier de l'analyse photo de Life Sport Tracker.

Regle produit (Islam, 2026-09-22) : on compte les REPAS ENREGISTRES, pas les
analyses. Gratuit : 2 par jour ; abonne : 100 par jour. Le jour est le jour
LOCAL de l'utilisateur.

Points d'entree :
  GET  /health                    sonde, sans authentification
  GET  /v1/quota[?refresh=1]      etat du quota de l'appareil
  POST /v1/quota/consume          {"analysisId": "..."} : un repas enregistre
  GET  /internal/quota/check      appele par Caddy (forward_auth) AVANT chaque
                                  analyse : 2xx = on laisse passer, 402 = refus

En-tetes lus : Authorization (meme cle que les autres services), X-Device-Id,
X-Utc-Offset (minutes a ajouter a l'UTC, borne a +/- 14 h).

Abonnement : verifie aupres de RevenueCat (GET /v1/subscribers/<id>), avec
un cache court. RevenueCat injoignable : on garde le dernier etat connu
pendant 24 h, pour ne pas bloquer un abonne pendant une panne.

Transition (decision d'Islam) : une requete SANS X-Device-Id vient d'une
version de l'app anterieure au quota serveur. Elle passe, et elle est
comptee dans `legacy_hits` pour savoir quand on pourra la couper
(LST_QUOTA_ALLOW_LEGACY=0).

Limite connue : sans Play Integrity, un client modifie peut forger des
identifiants ou ne jamais declarer ses repas. Ce service arrete le
contournement courant (effacer les donnees, reinstaller), pas un attaquant.

Stdlib uniquement, meme convention que lst_catalog.py. Ecoute 127.0.0.1:8354.
Aucun secret dans ce fichier : tout vient de l'environnement
(/etc/lst-quota.env, hors depot).
"""

import json
import os
import re
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# --- Configuration -------------------------------------------------------

PORT = int(os.environ.get("LST_QUOTA_PORT", "8354"))
DB_PATH = os.environ.get("LST_QUOTA_DB", "/opt/lst-quota/data/quota.db")
API_KEY = os.environ.get("LST_API_KEY", "")
REVENUECAT_SECRET_KEY = os.environ.get("REVENUECAT_SECRET_KEY", "")
REVENUECAT_ENTITLEMENT = os.environ.get("REVENUECAT_ENTITLEMENT", "premium")
ALLOW_LEGACY = os.environ.get("LST_QUOTA_ALLOW_LEGACY", "1") == "1"

FREE_DAILY_LIMIT = 2
PREMIUM_DAILY_LIMIT = 100

ENTITLEMENT_TTL_S = 10 * 60
ENTITLEMENT_STALE_OK_S = 24 * 3600
REFRESH_MIN_INTERVAL_S = 3
REVENUECAT_TIMEOUT_S = 5

MAX_OFFSET_MIN = 14 * 60

# Minimisation (RGPD) : seul le jour courant sert au decompte. On garde 30 jours
# pour repondre a une reclamation (« j'ai ete bloque hier »), puis on efface.
# Duree choisie par l'agent, a valider par Islam — voir la politique 3.7.
RETENTION_S = 30 * 24 * 3600
PURGE_EVERY_S = 3600
DEVICE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,80}$")
ANALYSIS_ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,80}$")


# --- Regles pures (testees sans reseau ni disque) -------------------------

def parse_offset(raw):
    """Decalage en minutes, borne. Absent ou illisible : 0 (UTC)."""
    try:
        value = int(str(raw).strip())
    except (TypeError, ValueError):
        return 0
    return max(-MAX_OFFSET_MIN, min(MAX_OFFSET_MIN, value))


def local_day(now_utc, offset_min):
    """Jour local AAAA-MM-JJ de l'utilisateur, a partir de l'heure UTC."""
    return (now_utc + timedelta(minutes=offset_min)).strftime("%Y-%m-%d")


def valid_device_id(value):
    return isinstance(value, str) and bool(DEVICE_ID_RE.match(value))


def valid_analysis_id(value):
    return isinstance(value, str) and bool(ANALYSIS_ID_RE.match(value))


def limit_for(tier):
    return PREMIUM_DAILY_LIMIT if tier == "premium" else FREE_DAILY_LIMIT


def _parse_iso(value):
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def is_entitled(payload, entitlement, now_utc):
    """
    Lit la reponse RevenueCat /v1/subscribers. Abonne si le droit existe et
    que sa fin (ou sa periode de grace) est dans le futur. `expires_date`
    nul = droit sans fin.
    """
    entitlements = ((payload or {}).get("subscriber") or {}).get("entitlements") or {}
    entry = entitlements.get(entitlement)
    if not isinstance(entry, dict):
        return False
    if "expires_date" in entry and entry.get("expires_date") is None:
        return True
    for key in ("expires_date", "grace_period_expires_date"):
        end = _parse_iso(entry.get(key))
        if end is not None and end > now_utc:
            return True
    return False


def quota_status(day, tier, used):
    limit = limit_for(tier)
    return {
        "day": day,
        "tier": tier,
        "limit": limit,
        "used": used,
        "remaining": max(0, limit - min(used, limit)),
    }


# --- Stockage --------------------------------------------------------------

class Store:
    """SQLite, une connexion par operation : suffisant a cette echelle et sans
    partage de connexion entre fils."""

    def __init__(self, path):
        self.path = path
        if path != ":memory:":
            os.makedirs(os.path.dirname(path), exist_ok=True)
        self._memory = sqlite3.connect(path, check_same_thread=False) if path == ":memory:" else None
        self._lock = threading.Lock()
        with self._conn() as db:
            db.executescript(
                """
                CREATE TABLE IF NOT EXISTS consumptions (
                    device_id   TEXT NOT NULL,
                    analysis_id TEXT NOT NULL,
                    day         TEXT NOT NULL,
                    created_at  REAL NOT NULL,
                    PRIMARY KEY (device_id, analysis_id)
                );
                CREATE INDEX IF NOT EXISTS consumptions_day
                    ON consumptions (device_id, day);
                CREATE TABLE IF NOT EXISTS entitlements (
                    device_id  TEXT PRIMARY KEY,
                    premium    INTEGER NOT NULL,
                    checked_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS legacy_hits (
                    day   TEXT PRIMARY KEY,
                    count INTEGER NOT NULL
                );
                """
            )

    def _conn(self):
        if self._memory is not None:
            return _Shared(self._memory, self._lock)
        db = sqlite3.connect(self.path, timeout=5)
        db.execute("PRAGMA journal_mode=WAL")
        return _Owned(db)

    def used(self, device_id, day):
        with self._conn() as db:
            row = db.execute(
                "SELECT COUNT(*) FROM consumptions WHERE device_id = ? AND day = ?",
                (device_id, day),
            ).fetchone()
        return int(row[0]) if row else 0

    def consume(self, device_id, analysis_id, day, now):
        """Idempotent : un meme analysisId ne compte qu'une fois."""
        with self._conn() as db:
            db.execute(
                "INSERT OR IGNORE INTO consumptions VALUES (?, ?, ?, ?)",
                (device_id, analysis_id, day, now),
            )

    def entitlement(self, device_id):
        with self._conn() as db:
            row = db.execute(
                "SELECT premium, checked_at FROM entitlements WHERE device_id = ?",
                (device_id,),
            ).fetchone()
        return (bool(row[0]), float(row[1])) if row else None

    def save_entitlement(self, device_id, premium, now):
        with self._conn() as db:
            db.execute(
                "INSERT INTO entitlements VALUES (?, ?, ?) "
                "ON CONFLICT(device_id) DO UPDATE SET premium = excluded.premium, "
                "checked_at = excluded.checked_at",
                (device_id, 1 if premium else 0, now),
            )

    def purge(self, older_than):
        """Efface les decomptes et les etats d'abonnement plus anciens que `older_than`."""
        with self._conn() as db:
            db.execute("DELETE FROM consumptions WHERE created_at < ?", (older_than,))
            db.execute("DELETE FROM entitlements WHERE checked_at < ?", (older_than,))

    def legacy_hit(self, day):
        with self._conn() as db:
            db.execute(
                "INSERT INTO legacy_hits VALUES (?, 1) "
                "ON CONFLICT(day) DO UPDATE SET count = count + 1",
                (day,),
            )


class _Owned:
    """Valide (ou annule) PUIS ferme : `with sqlite3.connect()` seul valide
    mais ne ferme pas la connexion."""

    def __init__(self, db):
        self.db = db

    def __enter__(self):
        return self.db

    def __exit__(self, exc_type, *_):
        try:
            if exc_type is None:
                self.db.commit()
            else:
                self.db.rollback()
        finally:
            self.db.close()
        return False


class _Shared:
    """Gestionnaire de contexte pour la base en memoire des tests."""

    def __init__(self, db, lock):
        self.db, self.lock = db, lock

    def __enter__(self):
        self.lock.acquire()
        return self.db

    def __exit__(self, exc_type, *_):
        try:
            if exc_type is None:
                self.db.commit()
            else:
                self.db.rollback()
        finally:
            self.lock.release()
        return False


# --- Abonnement ------------------------------------------------------------

def fetch_revenuecat(device_id):
    """Renvoie le JSON RevenueCat, ou None si injoignable / non configure."""
    if not REVENUECAT_SECRET_KEY:
        return None
    url = "https://api.revenuecat.com/v1/subscribers/" + urllib.parse.quote(device_id, safe="")
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {REVENUECAT_SECRET_KEY}",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=REVENUECAT_TIMEOUT_S) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        print(f"[lst_quota] revenuecat indisponible: {error}", flush=True)
        return None


class Quota:
    def __init__(self, store, fetch=fetch_revenuecat, clock=time.time):
        self.store = store
        self.fetch = fetch
        self.clock = clock
        self._last_purge = 0.0

    def purge_if_due(self):
        now = self.clock()
        if now - self._last_purge >= PURGE_EVERY_S:
            self._last_purge = now
            self.store.purge(now - RETENTION_S)

    def tier(self, device_id, refresh=False):
        now = self.clock()
        known = self.store.entitlement(device_id)
        if known is not None:
            premium, checked_at = known
            age = now - checked_at
            fresh = age < ENTITLEMENT_TTL_S
            # `refresh` (juste apres un achat) contourne le cache, mais pas
            # plus d'une fois toutes les 3 s par appareil.
            if fresh and not (refresh and age >= REFRESH_MIN_INTERVAL_S):
                return "premium" if premium else "free"

        payload = self.fetch(device_id)
        if payload is None:
            if known is not None and now - known[1] < ENTITLEMENT_STALE_OK_S:
                return "premium" if known[0] else "free"
            return "free"

        premium = is_entitled(
            payload, REVENUECAT_ENTITLEMENT, datetime.fromtimestamp(now, tz=timezone.utc)
        )
        self.store.save_entitlement(device_id, premium, now)
        return "premium" if premium else "free"

    def status(self, device_id, offset_min, refresh=False):
        day = local_day(datetime.fromtimestamp(self.clock(), tz=timezone.utc), offset_min)
        return quota_status(day, self.tier(device_id, refresh), self.store.used(device_id, day))

    def consume(self, device_id, analysis_id, offset_min):
        self.purge_if_due()
        now = self.clock()
        day = local_day(datetime.fromtimestamp(now, tz=timezone.utc), offset_min)
        self.store.consume(device_id, analysis_id, day, now)
        return self.status(device_id, offset_min)


# --- Serveur HTTP ------------------------------------------------------------

def make_handler(quota, api_key, allow_legacy):
    class Handler(BaseHTTPRequestHandler):
        server_version = "lst-quota/1.0"

        def _send_json(self, code, obj):
            body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _error(self, code, err_code, message, **extra):
            payload = {"error": {"code": err_code, "message": message}}
            payload.update(extra)
            self._send_json(code, payload)

        def _authorized(self):
            return bool(api_key) and self.headers.get("Authorization") == f"Bearer {api_key}"

        def _identity(self):
            return self.headers.get("X-Device-Id"), parse_offset(self.headers.get("X-Utc-Offset"))

        def do_GET(self):  # noqa: N802
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path

            if path in ("/health", "/v1/quota/health"):
                self._send_json(200, {"ok": True, "service": "lst-quota"})
                return

            if not self._authorized():
                self._error(401, "unauthorized", "cle API absente ou invalide")
                return

            device_id, offset = self._identity()

            if path == "/internal/quota/check":
                if device_id is None:
                    now = datetime.fromtimestamp(quota.clock(), tz=timezone.utc)
                    quota.store.legacy_hit(local_day(now, 0))
                    if allow_legacy:
                        self._send_json(200, {"ok": True, "legacy": True})
                    else:
                        self._error(426, "upgrade_required", "mettre a jour l'application")
                    return
                if not valid_device_id(device_id):
                    self._error(400, "invalid_device", "identifiant d'appareil invalide")
                    return
                status = quota.status(device_id, offset)
                if status["used"] >= status["limit"] and status["tier"] == "free":
                    # Avant de refuser, reverifier l'abonnement : l'achat vient
                    # peut-etre d'avoir lieu et le cache dit encore « gratuit ».
                    status = quota.status(device_id, offset, refresh=True)
                if status["used"] >= status["limit"]:
                    self._error(402, "quota_exceeded", "limite journaliere atteinte", quota=status)
                    return
                self._send_json(200, {"ok": True, "quota": status})
                return

            if path == "/v1/quota":
                if not valid_device_id(device_id):
                    self._error(400, "invalid_device", "identifiant d'appareil invalide")
                    return
                refresh = urllib.parse.parse_qs(parsed.query).get("refresh", ["0"])[0] == "1"
                self._send_json(200, {"quota": quota.status(device_id, offset, refresh)})
                return

            self._error(404, "not_found", "route inconnue")

        def do_POST(self):  # noqa: N802
            path = urllib.parse.urlparse(self.path).path
            if not self._authorized():
                self._error(401, "unauthorized", "cle API absente ou invalide")
                return
            if path != "/v1/quota/consume":
                self._error(404, "not_found", "route inconnue")
                return

            device_id, offset = self._identity()
            if not valid_device_id(device_id):
                self._error(400, "invalid_device", "identifiant d'appareil invalide")
                return
            try:
                length = min(int(self.headers.get("Content-Length", "0")), 4096)
                body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            except (ValueError, UnicodeDecodeError):
                self._error(400, "invalid_body", "corps JSON invalide")
                return
            analysis_id = body.get("analysisId") if isinstance(body, dict) else None
            if not valid_analysis_id(analysis_id):
                self._error(400, "invalid_analysis", "analysisId invalide")
                return
            self._send_json(200, {"quota": quota.consume(device_id, analysis_id, offset)})

        def log_message(self, *args):
            pass

    return Handler


def main():
    if not API_KEY:
        raise SystemExit("[lst_quota] LST_API_KEY absente : refus de demarrer")
    if not REVENUECAT_SECRET_KEY:
        print("[lst_quota] REVENUECAT_SECRET_KEY absente : tout le monde est au palier gratuit", flush=True)
    quota = Quota(Store(DB_PATH))
    print(f"[lst_quota] ecoute sur 127.0.0.1:{PORT} (anciennes versions admises : {ALLOW_LEGACY})", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), make_handler(quota, API_KEY, ALLOW_LEGACY)).serve_forever()


if __name__ == "__main__":
    main()
