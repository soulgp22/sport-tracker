# Serveur Life Sport Tracker sur le ThinkCentre

Depuis le 2026-09-26, les services de l'app tournent sur le ThinkCentre
(Windows 11, chez Islam) au lieu du VPS Hetzner, exposés
sur internet par **Tailscale Funnel** :

```
https://thinkcentre-srv.tail18230b.ts.net   (EXPO_PUBLIC_MEAL_SERVER_URL, app >= 1.32)
```

## Ce qui tourne

| Tâche planifiée | Service | Port local | Code |
|---|---|---|---|
| `LST-caddy` | reverse proxy HTTP (Funnel porte le TLS) | 127.0.0.1:8080 | `C:\LST\Caddyfile` |
| `LST-meal-router` | analyse photo (Gemini) + `/v1/food-info` | 127.0.0.1:8352 | `C:\opt\meal-server\meal_router.py` |
| `LST-lst-catalog` | exercices, aliments, codes-barres | 127.0.0.1:8353 | `C:\opt\lst-catalog\lst_catalog.py` |
| `LST-training-upload` | corrections photo (option d'entraînement) | 127.0.0.1:8351 | `C:\opt\meal-training\upload_server.py` |

Chaque tâche lance `C:\LST\run.ps1 -Name <service>`, qui relance le service
5 s après un arrêt et journalise dans `C:\LST\logs\<service>.log`. Déclencheur :
démarrage de la machine, sans session ouverte (S4U).

**Les scripts Python sont ceux du VPS, sans modification.** Ils utilisent des
chemins `/opt/...` : sous Windows, ces chemins se résolvent sur le lecteur
courant, d'où `C:\opt` et le `Set-Location C:\` de `run.ps1`. Ils contiennent
les clés (Bearer de l'app, Gemini) : ils ne vont **jamais** dans le dépôt, qui
est public.

Python : copie autonome `C:\LST\python` (3.12, stdlib seulement, rien à
installer). Caddy : binaire officiel v2.11.4, SHA-512 vérifié.

## Pas repris du VPS

- **Modèle v9** (`llama-server`) : l'app force `?engine=gemini`, et `/health`
  répond 200 même sans v9. Fichiers conservés dans la sauvegarde.
- **`lst-quota`** : jamais activé sur le VPS. Copié dans `C:\opt\lst-quota`,
  inactif.
- **`/cardsight`** : autre projet, reste sur le VPS.

Sauvegarde complète du VPS avant migration : `E:\AI\backups\lst-vps-2026-09-26\`.

## Installer ou réinstaller

1. Copier `Caddyfile`, `run.ps1`, `install.ps1` et `caddy.exe` dans `C:\LST`,
   le Python dans `C:\LST\python`, les services dans `C:\opt`.
2. `powershell -ExecutionPolicy Bypass -File C:\LST\install.ps1`, dans la
   session du compte qui fera tourner les services.
3. Dans la session Windows **propriétaire de Tailscale** (seule autorisée à
   configurer Funnel) :
   `tailscale funnel --bg 8080`.

## Vérifier

```bash
curl -s https://thinkcentre-srv.tail18230b.ts.net/health     # {"status": "ok", ...}
curl -s -o /dev/null -w "%{http_code}" https://thinkcentre-srv.tail18230b.ts.net/v1/foods?q=riz   # 401 sans clé
```

## Limites connues

- Le serveur dépend de la machine et de la box : les 2 arrêts brutaux mesurés
  en 30 jours (septembre 2026) coupent l'analyse photo le temps du redémarrage.
- 8 Go de RAM partagés avec CIR. Les services pèsent ~100 Mo au total.
- Les versions ≤ 1.31 de l'app appellent encore `lifesporttracker.duckdns.org`
  (le VPS) : ne pas supprimer le VPS tant qu'elles restent nombreuses.
