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

## Serveur repas (VPS)

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
