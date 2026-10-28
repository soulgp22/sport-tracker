# connexions.md — Services, accès et configuration

> ⚠️ **Le dépôt `soulgp22/sport-tracker` est PUBLIC.**
> Ce fichier décrit **où** vivent les accès, jamais leur valeur.
> Aucun mot de passe, clé ou jeton ne doit apparaître ici.

---

## Où vivent les secrets

| Secret | Emplacement | Suivi par git ? |
|---|---|---|
| URL + clé du serveur repas | `.env` (racine) | **non** — gitignoré |
| Modèle du `.env` | `.env.example` | oui, valeurs factices |
| Keystore EAS + mots de passe | `keys/` | **non** — gitignoré |
| Clé de service Google Play | `pc-api-key.json` | **non** — gitignoré |
| Keystores Android | `android/app/*.keystore` | **non** — gitignoré |
| Mots de passe de signature | `android/app/build.gradle` | **non** — `android/` gitignoré |
| Identifiants VPS, DuckDNS, Gemini | HANDOFF privé du projet training | hors dépôt |

**Avant tout push :** vérifier qu'aucun secret n'entre dans un fichier suivi.
Un scan par motif `clé = valeur` **rate** le format Gradle `storePassword 'valeur'`
(espace, pas de signe égal) — ne pas s'y fier seul.

---

## Configuration de l'application

L'app lit sa configuration serveur via les variables **`EXPO_PUBLIC_*`**, que le
bundler Expo inline dans le bundle au moment du build :

```
EXPO_PUBLIC_MEAL_SERVER_URL=…
EXPO_PUBLIC_MEAL_SERVER_API_KEY=…
```

> **Piège :** sans `.env` au moment du build, ces valeurs sont vides et la
> fonctionnalité photo se désactive **silencieusement**
> (`canUseMealPhoto()` → `server-config`). Un build sur une machine neuve produit
> une app amputée sans erreur visible. Vérifier la présence du `.env` avant tout
> build destiné à la publication.

---

## Serveur de l'app sur le ThinkCentre (depuis la 1.32)

Mêmes services que le VPS, sur le ThinkCentre d'Islam (Windows), exposés par
**Tailscale Funnel** : `https://thinkcentre-srv.tail18230b.ts.net`.
Installation, tâches planifiées, vérification et limites :
[`server/thinkcentre/README.md`](server/thinkcentre/README.md). Les accès
d'administration ne sont pas consignés ici (dépôt public). Ne jamais toucher
`C:\CIR` ni les tâches `GPORais-*` de cette machine.

## Serveur repas (VPS) — versions ≤ 1.31

Hébergé chez Hetzner, exposé en HTTPS via un domaine DuckDNS, reverse proxy Caddy
avec certificat Let's Encrypt.

Cinq services `systemd` :

| Service | Port interne | Rôle |
|---|---|---|
| `meal-server` | — | llama-server + modèle v9 (GGUF) |
| `meal-router` | 8352 | routeur v9 / Gemini, contrat OpenAI |
| `meal-training-upload` | — | collecte des corrections opt-in |
| `lst-catalog` | 8353 | catalogues exercices / aliments + proxy code-barres |
| `caddy` | 443 | HTTPS et reverse proxy |

Le routeur sert le modèle **v9 par défaut** ; l'app force `?engine=gemini`.
La clé Gemini vit **sur le VPS**, jamais dans l'app.

`lst-catalog` (`/opt/lst-catalog/lst_catalog.py`, stdlib Python) sert trois
familles d'endpoints, routées par Caddy **avant** le `reverse_proxy` par défaut
vers 8352 :

```
handle /v1/exercises*  { reverse_proxy 127.0.0.1:8353 }
handle /v1/foods*      { reverse_proxy 127.0.0.1:8353 }
handle /v1/products*   { reverse_proxy 127.0.0.1:8353 }
```

L'ordre compte : sans ces blocs placés en premier, ces chemins partiraient vers
le routeur repas, qui répondrait 404.

Commandes utiles : `journalctl -u meal-server -f`,
`systemctl restart meal-router`, `systemctl status lst-catalog`.

### Service `lst-quota` (quota photo, abonnement)

| | |
|---|---|
| Code | `/opt/lst-quota/lst_quota.py` (copie de `server/lst-quota/`) |
| Port | 127.0.0.1:8354 |
| Configuration | `/etc/lst-quota.env` (chmod 600) — modèle `server/lst-quota/lst-quota.env.example` |
| Base | `/opt/lst-quota/data/quota.db` (SQLite, rétention 30 jours) |
| Caddy | `handle /v1/quota*` + `forward_auth` sur `/v1/chat/completions*` — voir `Caddyfile.snippet` |

Déploiement et retour arrière : `server/lst-quota/README.md`.

**Clés RevenueCat — deux, à ne pas confondre :**

| Clé | Où | Nature |
|---|---|---|
| SDK Android `goog_…` | `.env` de l'app : `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | publique, inlinée dans l'APK |
| Secrète `sk_…` | `/etc/lst-quota.env` sur le VPS | **secrète**, jamais dans l'app ni le dépôt |
| Test Store `test_…` | `.env` local, pour l'émulateur | **interdite en release** : RevenueCat le proscrit |

**Configuration de l'abonnement (2026-10-15)** — à garder alignée sur le code
(`src/lib/billing/revenueCat.ts`) :

| Où | Élément | Valeur |
|---|---|---|
| Play Console | abonnement | `lst_premium` |
| Play Console | offre de base mensuelle | `mensuel` (P1M, 9,99 € TTC dans les 33 pays en euros) |
| Play Console | offre de base annuelle | `annuel-1an` (P1Y, 79,99 € TTC) — `annuel` est **désactivée** (créée en P1M par erreur) |
| RevenueCat | projet | Life Sport Tracker, app Play `com.sportracker.app` |
| RevenueCat | droit d'accès | **`premium`** (l'app et `lst-quota` cherchent ce nom ; `life_sport_tracker_pro`, créé par défaut, n'est pas utilisé) |
| RevenueCat | offre courante | `default` : `$rc_monthly` → `lst_premium:mensuel`, `$rc_annual` → `lst_premium:annuel-1an` (+ produits Test Store pour l'émulateur) |
| Play Console | offre d'essai (sur `annuel-1an`) | `essai-7j` : 7 jours gratuits (P7D ×1), puis le prix de l'annuel ; nouveaux clients de `lst_premium` seulement ; tag `essai-7j`. Créée le 2026-10-18, **activée le 2026-10-18 à la demande d'Islam**, avant toute production avec paiement (la production est en 1.33, sans achat) : la comparaison avec / sans essai n'a donc pas de mois de référence sans essai. |

L'offre d'essai ne demande **aucun réglage RevenueCat** : `purchasePackage`
achète l'option par défaut que RevenueCat choisit parmi les offres Google
auxquelles l'utilisateur a droit (essai le plus long d'abord), et l'écran
d'abonnement n'annonce l'essai que si cette option en contient un (≥ 1.38).
Pendant l'essai, le droit `premium` est actif : `lst-quota` accorde les 100
analyses. Activer, désactiver ou relire : `scratchpad/play-trial-offer.mjs`
(`status`, `activate`, `deactivate`) ou Play Console → Monétiser → Abonnements
→ `lst_premium` → `annuel-1an` → `essai-7j`.

Les prix Play se saisissent **hors taxe** : Google ajoute la TVA de chaque
pays (9,99 saisi = 11,99 € payé en France). Script de correction et de
relecture par l'API : voir `known_bugs.md`.

### Vérifier que le serveur est vivant, depuis l'extérieur

```bash
curl -s https://<domaine>/health          # -> {"status": "ok"}  (meal-router)
```

⚠️ **`/health` ne teste QUE le routeur repas.** Caddy ne l'achemine pas vers
`lst-catalog` : ce service peut être arrêté alors que `/health` répond « ok ».
Pour le contrôler, il faut un appel authentifié à l'un de ses endpoints :

```bash
curl -s -H "Authorization: Bearer $CLE" \
  "https://<domaine>/v1/foods?q=riz&limit=1"
```

Un `401` sur `/v1/*` signifie que la passerelle fonctionne et que la clé est
absente ou fausse — pas que le service est tombé.

**Dernière vérification externe : 2026-08-11.** `/health` 200 ;
`/v1/exercises?q=traction` → 15 résultats ; `/v1/foods?q=riz` → 4 résultats ;
`/v1/products/<code>` → 401 sans clé.

---

## Google Play

- **Compte Expo :** `soulgp`
- **Paquet :** `com.sportracker.app`
- **Piste utilisée :** `internal` (test interne)
- **Soumission :** `eas submit --platform android --profile production --path <aab>`
- **Production :** 1.39.4 (versionCode 61) le 2026-10-28 (section Health
  Connect dans Paramètres ; sans lecture en arrière-plan), promue par
  `scripts/play-promote.py`. Le vc 60 n'a jamais été publié (refus Google,
  voir `known_bugs.md`). Précédentes : 1.39.3 (vc 59) le 2026-10-27,
  1.39.2 (vc 58) le 2026-10-22, 1.38.0 (vc 55) le 2026-10-18.
- **Téléversement :** `eas submit` a cassé en fin d'envoi (`ECONNRESET` après
  40 min, comme le 2026-10-18). Utiliser désormais
  `python scripts/play-upload.py <aab> internal completed <notes.json>` :
  envoi par morceaux de 8 Mio par l'API Play, reprise au dernier octet reçu,
  46 min à ~60 Ko/s pour 177 Mo. Puis `play-promote.py` vers `production`.
- **Dernière soumission :** 1.39.4 (versionCode 61), piste interne puis
  production, 2026-10-28 : `play-upload.py` en 28 min (~105 Ko/s pour 178 Mo).
  Précédentes : 1.39.3 (vc 59) le 2026-10-27, 1.39.2 (vc 58) le 2026-10-22.
  Téléversement de 177 Mo : 3 min 35 s puis ~45 min selon le débit du jour
  (~70 Ko/s) ; la barre d'`eas submit` reste à 0 % jusqu'à la fin, ce n'est
  pas un blocage.

**Permissions Health Connect déclarées** (manifeste) : `READ_STEPS`,
`READ_ACTIVE_CALORIES_BURNED`, `READ_TOTAL_CALORIES_BURNED`.
`READ_HEALTH_DATA_IN_BACKGROUND` a été **retirée** en 1.39.4 (vc 61) après deux
refus de Google Play (vc 60 jamais publiée) : une nouvelle permission de santé
doit d'abord être importée **depuis la Play Console**, puis déclarée dans
*Applis de santé*, avant tout envoi par l'API. Détail : `known_bugs.md`.

**Deux clés de signature coexistent — ne pas les confondre :**

| Clé | Usage | Vérification |
|---|---|---|
| **EAS** (alias commençant par `e96922a6`) | **obligatoire pour l'AAB** Play Store | l'AAB doit contenir `META-INF/E96922A6.RSA` |
| `lst-release` (`CN=Life Sport Tracker`) | builds locaux uniquement | — |

Builder l'AAB avec `-PuseEasSigning=true`. Un AAB signé avec l'autre clé est
**rejeté** par Google.

**Verrou connu :** la production publique exige 12 à 20 testeurs fermés pendant
**14 jours**. Aucune optimisation technique ne raccourcit ce délai.

---

## GitHub

- **Dépôt :** `soulgp22/sport-tracker` — **PUBLIC**
- **CI :** GitHub Actions, build APK à chaque push sur `main`
- Le contenu communautaire est servi depuis `raw.githubusercontent.com`
  (voir le piège LFS dans [api.md](api.md))

---

## Environnement de développement

| Outil | Chemin / commande |
|---|---|
| SDK Android | `C:\Users\soulg\AppData\Local\Android\Sdk` |
| Émulateur | AVD `SportTracker_Pixel8` (Android 15, x86_64) |
| JDK pour Gradle | `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr` |
| npm / npx | ceux de kimi-desktop (le npm standard est cassé sur cette machine) |
| Build APK + AAB | `cd android && ./gradlew.bat assembleRelease bundleRelease -PuseEasSigning=true` |

Health Connect **est** présent sur l'émulateur (intégré via APEX en Android 15) :
`adb shell am start -a android.health.connect.action.HEALTH_HOME_SETTINGS`.

---

## Abonnement (F01)

- **RevenueCat** : projet à créer par Islam (compte, app Android
  `com.sportracker.app`, droit `premium`, offre par défaut avec les paquets
  mensuel et annuel). RevenueCat a besoin d'un **compte de service Google** avec
  les droits financiers pour valider les achats.
- **Google Play Console** : profil de paiement (marchand) Rais&Co, puis
  abonnement `premium` avec deux formules de base : `monthly` (9,99 €, P1M) et
  `annual` (79,99 €, P1Y). Google convertit le prix pour les autres pays.
- **Pages légales** : `/privacy` et `/terms` servies par Caddy depuis
  `/opt/meal-training/www/`, générées depuis `docs/play-store/`.
