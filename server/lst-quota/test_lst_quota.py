"""Tests de lst_quota. Lancer : python -m unittest server/lst-quota/test_lst_quota.py"""

import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(__file__))
import lst_quota as q  # noqa: E402

KEY = "cle-de-test"
DEVICE = "and-0123456789abcdef"
# 2026-09-22 22:30 UTC = 2026-09-23 00:30 a Paris (UTC+2).
NOW = datetime(2026, 9, 22, 22, 30, tzinfo=timezone.utc).timestamp()


def premium_payload(expires="2026-10-22T00:00:00Z", grace=None):
    entry = {"expires_date": expires}
    if grace is not None:
        entry["grace_period_expires_date"] = grace
    return {"subscriber": {"entitlements": {"premium": entry}}}


class Rules(unittest.TestCase):
    def test_jour_local_et_non_utc(self):
        now = datetime.fromtimestamp(NOW, tz=timezone.utc)
        self.assertEqual(q.local_day(now, 120), "2026-09-23")
        self.assertEqual(q.local_day(now, 0), "2026-09-22")
        self.assertEqual(q.local_day(now, -300), "2026-09-22")

    def test_decalage_borne_et_tolerant(self):
        self.assertEqual(q.parse_offset("120"), 120)
        self.assertEqual(q.parse_offset("99999"), 14 * 60)
        self.assertEqual(q.parse_offset("-99999"), -14 * 60)
        self.assertEqual(q.parse_offset(None), 0)
        self.assertEqual(q.parse_offset("abc"), 0)

    def test_droit_revenuecat(self):
        now = datetime.fromtimestamp(NOW, tz=timezone.utc)
        self.assertTrue(q.is_entitled(premium_payload(), "premium", now))
        self.assertFalse(q.is_entitled(premium_payload("2026-09-01T00:00:00Z"), "premium", now))
        # Periode de grace (echec de paiement en cours de resolution) : toujours abonne.
        self.assertTrue(q.is_entitled(
            premium_payload("2026-09-01T00:00:00Z", grace="2026-09-30T00:00:00Z"), "premium", now))
        self.assertTrue(q.is_entitled(premium_payload(expires=None), "premium", now))
        self.assertFalse(q.is_entitled({"subscriber": {"entitlements": {}}}, "premium", now))
        self.assertFalse(q.is_entitled(None, "premium", now))

    def test_identifiants(self):
        self.assertTrue(q.valid_device_id(DEVICE))
        self.assertFalse(q.valid_device_id("court"))
        self.assertFalse(q.valid_device_id("and-../../etc"))
        self.assertFalse(q.valid_device_id(None))


class QuotaLogic(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.answer = None
        self.clock = [NOW]

        def fetch(device_id):
            self.calls.append(device_id)
            return self.answer

        self.quota = q.Quota(q.Store(":memory:"), fetch=fetch, clock=lambda: self.clock[0])

    def test_gratuit_limite_a_deux_repas(self):
        self.answer = {"subscriber": {"entitlements": {}}}
        self.quota.consume(DEVICE, "a-1", 120)
        status = self.quota.consume(DEVICE, "a-2", 120)
        self.assertEqual(status["tier"], "free")
        self.assertEqual(status["used"], 2)
        self.assertEqual(status["remaining"], 0)

    def test_consume_idempotent(self):
        self.quota.consume(DEVICE, "a-1", 120)
        status = self.quota.consume(DEVICE, "a-1", 120)
        self.assertEqual(status["used"], 1)

    def test_abonne_limite_a_cent(self):
        self.answer = premium_payload()
        status = self.quota.status(DEVICE, 120)
        self.assertEqual((status["tier"], status["limit"]), ("premium", 100))

    def test_cache_puis_refresh(self):
        self.answer = {"subscriber": {"entitlements": {}}}
        self.assertEqual(self.quota.tier(DEVICE), "free")
        self.answer = premium_payload()
        # Cache frais : pas de nouvel appel.
        self.assertEqual(self.quota.tier(DEVICE), "free")
        self.assertEqual(len(self.calls), 1)
        # Juste apres l'achat, refresh demande mais trop tot : cache conserve.
        self.assertEqual(self.quota.tier(DEVICE, refresh=True), "free")
        self.clock[0] += q.REFRESH_MIN_INTERVAL_S
        self.assertEqual(self.quota.tier(DEVICE, refresh=True), "premium")

    def test_panne_revenuecat_garde_le_dernier_etat(self):
        self.answer = premium_payload()
        self.assertEqual(self.quota.tier(DEVICE), "premium")
        self.answer = None
        self.clock[0] += q.ENTITLEMENT_TTL_S + 1
        self.assertEqual(self.quota.tier(DEVICE), "premium")
        self.clock[0] += q.ENTITLEMENT_STALE_OK_S
        self.assertEqual(self.quota.tier(DEVICE), "free")

    def test_efface_les_donnees_de_plus_de_30_jours(self):
        self.answer = {"subscriber": {"entitlements": {}}}
        self.quota.consume(DEVICE, "a-1", 120)
        self.quota.tier(DEVICE)
        self.clock[0] += q.RETENTION_S + q.PURGE_EVERY_S + 1
        self.quota.consume("and-autreappareil", "a-9", 120)
        with self.quota.store._conn() as db:
            devices = {row[0] for row in db.execute("SELECT device_id FROM consumptions")}
            entitled = db.execute("SELECT COUNT(*) FROM entitlements WHERE device_id = ?", (DEVICE,)).fetchone()[0]
        self.assertEqual(devices, {"and-autreappareil"})
        self.assertEqual(entitled, 0)

    def test_compteur_par_jour_local(self):
        # 00:30 a Paris : ce repas est du 23, pas du 22.
        self.quota.consume(DEVICE, "a-1", 120)
        self.assertEqual(self.quota.status(DEVICE, 120)["used"], 1)
        self.assertEqual(self.quota.status(DEVICE, 0)["used"], 0)


class Http(unittest.TestCase):
    def setUp(self):
        self.quota = q.Quota(q.Store(":memory:"), fetch=lambda _d: None, clock=lambda: NOW)
        self.start(allow_legacy=True)

    def start(self, allow_legacy):
        handler = q.make_handler(self.quota, KEY, allow_legacy)
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.server.server_address[1]}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def call(self, method, path, headers=None, body=None):
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(self.base + path, data=data, method=method,
                                         headers={"Authorization": f"Bearer {KEY}", **(headers or {})})
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    def device(self):
        return {"X-Device-Id": DEVICE, "X-Utc-Offset": "120"}

    def test_refuse_sans_cle(self):
        code, _ = self.call("GET", "/v1/quota", {"Authorization": "Bearer faux", **self.device()})
        self.assertEqual(code, 401)

    def test_check_bloque_au_troisieme_repas(self):
        for analysis in ("a-000001", "a-000002"):
            code, _ = self.call("GET", "/internal/quota/check", self.device())
            self.assertEqual(code, 200)
            self.call("POST", "/v1/quota/consume", self.device(), {"analysisId": analysis})
        code, body = self.call("GET", "/internal/quota/check", self.device())
        self.assertEqual(code, 402)
        self.assertEqual(body["error"]["code"], "quota_exceeded")
        self.assertEqual(body["quota"]["used"], 2)

    def test_ancienne_version_admise_et_comptee(self):
        code, body = self.call("GET", "/internal/quota/check")
        self.assertEqual((code, body.get("legacy")), (200, True))

    def test_ancienne_version_coupee(self):
        self.tearDown()
        self.start(allow_legacy=False)
        code, _ = self.call("GET", "/internal/quota/check")
        self.assertEqual(code, 426)

    def test_consume_refuse_un_identifiant_invalide(self):
        code, _ = self.call("POST", "/v1/quota/consume", self.device(), {"analysisId": "../x"})
        self.assertEqual(code, 400)


if __name__ == "__main__":
    unittest.main()
