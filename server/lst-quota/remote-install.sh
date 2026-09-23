#!/usr/bin/env bash
# Execute SUR le VPS par deploy-from-pc.sh (ssh 'bash -s'). Idempotent.
# Suppose deja copies : /opt/lst-quota/lst_quota.py, /etc/systemd/system/lst-quota.service.
set -euo pipefail

# 1. Configuration : la cle Bearer est relue sur le serveur lui-meme (meme cle
#    que meal-router et lst-catalog). Elle ne transite ni n'est affichee.
if [ ! -f /etc/lst-quota.env ]; then
  umask 077
  python3 - <<'PY'
import re
src = open("/opt/meal-server/meal_router.py", encoding="utf-8").read()
key = re.search(r'^API_KEY = "([^"]+)"', src, re.M).group(1)
with open("/etc/lst-quota.env", "w", encoding="utf-8") as handle:
    handle.write(
        f"LST_API_KEY={key}\n"
        "REVENUECAT_SECRET_KEY=\n"
        "REVENUECAT_ENTITLEMENT=premium\n"
        "LST_QUOTA_ALLOW_LEGACY=1\n"
        "LST_QUOTA_DB=/opt/lst-quota/data/quota.db\n"
        "LST_QUOTA_PORT=8354\n"
    )
PY
  echo "[1] /etc/lst-quota.env cree"
else
  echo "[1] /etc/lst-quota.env deja present, conserve"
fi
chmod 600 /etc/lst-quota.env
chmod 700 /opt/lst-quota/lst_quota.py
mkdir -p /opt/lst-quota/data

# 2. Service
systemctl daemon-reload
systemctl enable lst-quota >/dev/null 2>&1
systemctl restart lst-quota
sleep 2
curl -fsS 127.0.0.1:8354/health >/dev/null
KEY=$(grep '^LST_API_KEY=' /etc/lst-quota.env | cut -d= -f2-)
code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $KEY" 127.0.0.1:8354/internal/quota/check)
if [ "$code" != "200" ]; then
  echo "[2] ECHEC : le controle d'une ancienne version repond $code au lieu de 200. Caddy non modifie."
  exit 1
fi
echo "[2] lst-quota actif et repond"

# 3. Caddy — uniquement si le service repond (sinon toutes les analyses tomberaient).
CADDYFILE=/etc/caddy/Caddyfile
if grep -q '127.0.0.1:8354' "$CADDYFILE"; then
  echo "[3] Caddyfile deja branche sur lst-quota, inchange"
else
  cp -p "$CADDYFILE" "$CADDYFILE.bak-lst-quota"
  python3 - <<'PY'
path = "/etc/caddy/Caddyfile"
text = open(path, encoding="utf-8").read()
anchor = "    reverse_proxy 127.0.0.1:8352\n}"
if text.count(anchor) != 1:
    raise SystemExit(f"ancre trouvee {text.count(anchor)} fois au lieu d'une : insertion annulee")
snippet = """    handle /v1/quota* {
        reverse_proxy 127.0.0.1:8354
    }
    handle /v1/chat/completions* {
        forward_auth 127.0.0.1:8354 {
            uri /internal/quota/check
        }
        reverse_proxy 127.0.0.1:8352
    }
    handle /terms* {
        root * /opt/meal-training/www
        rewrite /terms /terms.html
        file_server
    }
"""
open(path, "w", encoding="utf-8").write(text.replace(anchor, snippet + anchor))
PY
  if ! caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1; then
    cp -p "$CADDYFILE.bak-lst-quota" "$CADDYFILE"
    echo "[3] ECHEC : Caddyfile invalide, sauvegarde restauree, rien n'a change"
    exit 1
  fi
  systemctl reload caddy
  echo "[3] Caddy recharge (sauvegarde : $CADDYFILE.bak-lst-quota)"
fi
