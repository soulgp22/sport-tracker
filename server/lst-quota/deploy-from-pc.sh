#!/usr/bin/env bash
# Deploie lst-quota et les pages legales depuis le PC, puis verifie de
# l'exterieur. A lancer a la racine du depot :
#
#   LST_VPS=root@<ip> bash server/lst-quota/deploy-from-pc.sh
#
# Variables : LST_VPS (obligatoire, hote SSH), LST_SSH_KEY (defaut
# ~/.ssh/meal-server-key). Le domaine et la cle viennent du .env local.
# Aucune valeur d'infrastructure n'est ecrite ici : le depot est public.
set -euo pipefail

: "${LST_VPS:?Definir LST_VPS=root@<ip-du-vps>}"
SSH_KEY="${LST_SSH_KEY:-$HOME/.ssh/meal-server-key}"
SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes "$LST_VPS")
SCP=(scp -q -i "$SSH_KEY" -o BatchMode=yes)

URL=$(grep -E '^EXPO_PUBLIC_MEAL_SERVER_URL=' .env | cut -d= -f2-)
KEY=$(grep -E '^EXPO_PUBLIC_MEAL_SERVER_API_KEY=' .env | cut -d= -f2-)
[ -n "$URL" ] && [ -n "$KEY" ] || { echo "URL ou cle absente du .env"; exit 1; }

echo "== Tests du service avant envoi"
python -m unittest server/lst-quota/test_lst_quota.py 2>&1 | tail -1

echo "== Pages legales"
PAGES=$(mktemp -d)
node scripts/build-legal-pages.mjs "$PAGES" >/dev/null
"${SSH[@]}" 'cp -pn /opt/meal-training/www/privacy.html /opt/meal-training/www/privacy.html.bak-avant-f01 2>/dev/null || true; mkdir -p /opt/lst-quota/data'
"${SCP[@]}" "$PAGES/privacy.html" "$PAGES/terms.html" "$LST_VPS:/opt/meal-training/www/"
"${SSH[@]}" 'chmod 644 /opt/meal-training/www/privacy.html /opt/meal-training/www/terms.html'

echo "== Service lst-quota"
"${SCP[@]}" server/lst-quota/lst_quota.py "$LST_VPS:/opt/lst-quota/lst_quota.py"
"${SCP[@]}" server/lst-quota/lst-quota.service "$LST_VPS:/etc/systemd/system/lst-quota.service"
"${SSH[@]}" 'bash -s' < server/lst-quota/remote-install.sh

echo "== Verifications depuis l'exterieur"
ok=1
check() { # nom attendu obtenu
  if [ "$2" = "$3" ]; then echo "  OK   $1 ($3)"; else echo "  ECHEC $1 : attendu $2, obtenu $3"; ok=0; fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

TEST_DEVICE="and-deploycheck$(date +%s)"
H=(-H "Authorization: Bearer $KEY" -H "X-Device-Id: $TEST_DEVICE" -H "X-Utc-Offset: 120")

check "routeur /health" 200 "$(code "$URL/health")"
check "politique /privacy" 200 "$(code "$URL/privacy")"
check "conditions /terms" 200 "$(code "$URL/terms")"
check "etat du quota" 200 "$(code "${H[@]}" "$URL/v1/quota")"
# Ancienne version (sans X-Device-Id) : le quota laisse passer, le routeur
# repond lui-meme (GET inconnu = 404), sans aucun appel a Gemini.
check "ancienne version admise" 404 "$(code -H "Authorization: Bearer $KEY" "$URL/v1/chat/completions")"
for id in a-deploy-000001 a-deploy-000002; do
  curl -s -o /dev/null "${H[@]}" -H 'Content-Type: application/json' -d "{\"analysisId\":\"$id\"}" "$URL/v1/quota/consume"
done
check "3e analyse refusee" 402 "$(code "${H[@]}" "$URL/v1/chat/completions")"

# Nettoyage de l'appareil fictif.
"${SSH[@]}" "python3 -c \"import sqlite3; db=sqlite3.connect('/opt/lst-quota/data/quota.db'); db.execute('DELETE FROM consumptions WHERE device_id=?',('$TEST_DEVICE',)); db.execute('DELETE FROM entitlements WHERE device_id=?',('$TEST_DEVICE',)); db.commit()\""

if [ "$ok" = 1 ]; then
  echo "== Deploiement valide."
else
  echo "== Au moins une verification a echoue. Retour arriere Caddy :"
  echo "   ssh ... 'cp -p /etc/caddy/Caddyfile.bak-lst-quota /etc/caddy/Caddyfile && systemctl reload caddy'"
  exit 1
fi
