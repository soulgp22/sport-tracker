# lst-quota — quota journalier de l'analyse photo

Service du VPS qui compte les **repas enregistrés** par appareil et par jour
local, et refuse l'analyse photo (HTTP 402) au-delà de la limite : **2 par jour**
en gratuit, **100** avec l'abonnement. L'abonnement est vérifié auprès de
RevenueCat. Contrat détaillé : [`api.md`](../../api.md), section 1 ter.

Stdlib Python + SQLite, comme `lst-catalog`. **Aucun secret dans le dépôt** :
tout vient de `/etc/lst-quota.env` (modèle : `lst-quota.env.example`).

## Tests

```bash
python -m unittest server/lst-quota/test_lst_quota.py
```

## Déploiement

**Automatisé**, depuis la racine du dépôt (tests, pages légales, service,
Caddy avec retour arrière si invalide, puis vérifications de l'extérieur) :

```bash
LST_VPS=root@<ip> bash server/lst-quota/deploy-from-pc.sh
```

Le détail, pour le faire à la main :

1. Copier `lst_quota.py` dans `/opt/lst-quota/` et `lst-quota.service` dans
   `/etc/systemd/system/`.
2. Créer `/etc/lst-quota.env` (chmod 600) à partir du modèle, avec la même
   `LST_API_KEY` que `lst-catalog`.
3. `systemctl daemon-reload && systemctl enable --now lst-quota`, puis
   `curl -s 127.0.0.1:8354/health`.
4. Sauvegarder `/etc/caddy/Caddyfile`, y insérer `Caddyfile.snippet` **avant**
   le `reverse_proxy 127.0.0.1:8352` final, puis `caddy validate` et
   `systemctl reload caddy`.
5. Vérifier depuis l'extérieur (voir `connexions.md`).

## Pages légales

`/privacy` et `/terms` sont générées depuis `docs/play-store/*.md` :

```bash
node scripts/build-legal-pages.mjs <dossier>
```

puis copiées dans `/opt/meal-training/www/`. À refaire à **chaque**
modification de ces documents : la page en ligne a déjà divergé du dépôt.

## Retour arrière

Restaurer la sauvegarde du Caddyfile puis `systemctl reload caddy` : l'analyse
redevient libre, sans toucher au routeur. Le service peut rester arrêté.

## Transition des anciennes versions

Une requête **sans** `X-Device-Id` vient d'une version de l'app antérieure au
quota serveur : elle passe, et elle est comptée par jour dans `legacy_hits`.
Quand ce compteur reste à zéro, passer `LST_QUOTA_ALLOW_LEGACY=0` : les
anciennes versions reçoivent alors 426 (mise à jour requise).

## Limites connues

- Sans **Play Integrity**, un client modifié peut forger des identifiants ou ne
  jamais déclarer ses repas. Le service arrête le contournement courant
  (effacer les données, réinstaller), pas un attaquant. Tâche séparée.
- Le jour local vient du décalage envoyé par l'app, borné à ±14 h : changer de
  fuseau donne au plus un jour de plus.
- Rétention : décomptes et états d'abonnement effacés après **30 jours**.
