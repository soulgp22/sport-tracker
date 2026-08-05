# PROMPT POUR KIMI 3 — Publication Life Sport Tracker sur le Play Store

> Ce document contient TOUTES les informations nécessaires pour que Kimi 3 puisse builder l'APK release et pousser Life Sport Tracker sur le Google Play Store.
> Projet : React Native / Expo app avec analyse de repas par IA (modèle v9 nutrition) en mode serveur.

---

## 📱 CONTEXTE DU PROJET

**Nom app** : Life Sport Tracker
**Slug** : sport-tracker
**Package Android** : `com.sportracker.app`
**Version actuelle** : 1.2.0 (versionCode 8)
**EAS Project ID** : `af38ec75-ab68-4fbe-9086-2f6655953ba9`
**Owner EAS** : `soulgp`

L'app est un tracker sportif/nutrition React Native/Expo. Sa fonctionnalité phare : **photographier un repas → l'app envoie la photo à un serveur VPS → le modèle IA (v9) analyse et renvoie les aliments + grammes estimés**.

Le modèle ne tourne PAS sur le téléphone. L'app fait un appel HTTPS à un serveur llama-server qui héberge le v9 en GGUF.

---

## 🧠 LE MODÈLE V9 (nutrition)

- **Base** : LiquidAI/LFM2.5-VL-450M (VLM vision-langage 450M paramètres)
- **Fine-tuné** en local sur RTX 5080 avec LoRA r=32, 3 époques
- **Dataset** : Nutrition5k uniquement (~11 900 plats, vrais labels grammes)
- **Format serveur** : GGUF Q4_K_M (~418 Mo) hébergé sur llama-server b10218
- **Performance** : F1 0,690, MAE 39,2g sur éval standardisée
- **Limite connue** : sur photos réelles (assiette entamée, angle biaisé), peut halluciner — c'est normal, le dataset était des photos "propres"

**Prompt envoyé au modèle** :
```
Analyze this meal photo.
List each visible food item with an estimated weight in grams.
Answer ONLY with valid JSON, no text before or after, in the exact format:
{"items":[{"name":"rice","grams":150}]}
Rules:
- "name": simple generic food name in English, no brand;
- "grams": estimated weight in grams, integer between 10 and 800;
- maximum 8 foods;
- do not compute calories or macronutrients;
- only describe what is actually visible and NEVER invent a food item;
- if the image contains neither food nor drink, or if you are not reasonably sure an element is edible, answer {"items":[]};
- when in doubt, answer {"items":[]} rather than guessing.
```

---

## 🌐 INFRASTRUCTURE SERVEUR (déjà en prod)

| Élément | Valeur |
|---------|--------|
| **VPS** | Hetzner CX23, Ubuntu 24.04 |
| **IP** | `<VPS_IP-PURGED>` |
| **Domaine** | `https://lifesporttracker.duckdns.org` |
| **HTTPS** | Caddy + Let's Encrypt (auto-renew) |
| **Clé API** | `<MEAL_SERVER_API_KEY-PURGED>` (embarquée dans l'app, révocable côté serveur) |
| **Endpoint analyse** | POST `/v1/chat/completions` (format OpenAI, image en base64 data URL) |
| **Endpoint health** | GET `/health` |
| **Endpoint collecte** | POST `/training/submit` (roue à données, opt-in utilisateur) |

Le serveur est déjà opérationnel. L'app est configurée pour pointer dessus.

---

## 📁 STRUCTURE DU PROJET MOBILE

**Chemin racine** : `E:\AI\Claude Code\sport-tracker`

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `app.json` | Config Expo (nom, version, permissions, icônes, splash) |
| `package.json` | Dépendances npm |
| `src/lib/mealPhotoApi.ts` | Config API serveur (URL, clé, timeouts, fonctions de requête) |
| `android/app/build.gradle` | Config build Android (versionCode, signing, keystore) |
| `android/app/lst-release.keystore` | Keystore de production Play Store |
| `android/app/src/main/AndroidManifest.xml` | Permissions Android |

### Config API (src/lib/mealPhotoApi.ts)
```typescript
export const MEAL_SERVER_URL = 'https://lifesporttracker.duckdns.org';
export const MEAL_SERVER_API_KEY = '<MEAL_SERVER_API_KEY-PURGED>';
const HEALTH_TIMEOUT_MS = 5000;
const ANALYSIS_TIMEOUT_MS = 60000;
const MAX_PREDICT_TOKENS = 256;
```
La photo est compressée à 768 px / JPEG qualité 0.6 avant envoi (`expo-image-manipulator`).

---

## 🔐 SIGNING & PLAY STORE

### Keystore de production
- **Fichier** : `android/app/lst-release.keystore`
- **Alias** : `lst-upload`
- **Store password** : `<KEYSTORE_PASSWORD-PURGED>`
- **Key password** : `<KEYSTORE_PASSWORD-PURGED>`
- **Backup** : `E:\Téléchargement\lst-release.keystore.BACKUP` (à conserver à vie)

Déjà configuré dans `build.gradle` :
```gradle
signingConfigs {
    release {
        storeFile file('lst-release.keystore')
        storePassword '<KEYSTORE_PASSWORD-PURGED>'
        keyAlias 'lst-upload'
        keyPassword '<KEYSTORE_PASSWORD-PURGED>'
    }
}
```

### Compte Play Store
- Le compte Google Play Console existe déjà (probablement lié au compte `soulgp`)
- L'app a déjà des versions précédentes (versionCode 8 = 1.2.0)
- **Package** : `com.sportracker.app` — ne JAMAIS changer

---

## 🛠️ COMMENT BUILDER L'APK RELEASE

### Prérequis
1. **Node.js** + npm installés
2. **Android Studio** installé (pour le SDK Android + Gradle)
3. **JAVA_HOME** pointant vers le JBR d'Android Studio :
   ```
   C:\Program Files\Android\Android Studio\jbr
   ```

### Commandes de build
```bash
cd "E:\AI\Claude Code\sport-tracker"

# 1. Installer les dépendances (si pas déjà fait)
npm install

# 2. Build Android release
# NOTE : sur ce PC, npm standard est cassé. Utiliser :
"C:\Users\soulg\AppData\Local\Programs\kimi-desktop\resources\resources\runtime\npm.cmd" install
cd android
.\gradlew.bat assembleRelease
```

### Output
L'APK signé se trouve dans :
```
E:\AI\Claude Code\sport-tracker\android\app\build\outputs\apk\release\app-release.apk
```

### Vérifications avant build
- [ ] Tests passent : `npm test` (332/332 OK attendus)
- [ ] Typecheck OK : `npx tsc --noEmit`
- [ ] VersionCode incrémenté dans `app.json` ET `build.gradle` si c'est une nouvelle version
- [ ] Keystore présent : `android/app/lst-release.keystore`
- [ ] `android/app/build.gradle` a bien `signingConfig signingConfigs.release` dans `buildTypes.release`

---

## 📤 ÉTAPES PUBLICATION PLAY STORE

### 1. Préparer les assets (si manquants)
Besoin pour le Play Store Console :
- [ ] **Icône haute résolution** (512x512) → `assets/images/icon.png` existe
- [ ] **Feature graphic** (1024x500) → à vérifier/créer
- [ ] **Screenshots** (phone + tablet) → prendre des captures de l'app
- [ ] **Short description** (80 caractères max)
- [ ] **Full description** (4000 caractères max)
- [ ] **Privacy policy** → https://lifesporttracker.duckdns.org/privacy (déjà en place)

### 2. Upload APK/AAB
- Se connecter à https://play.google.com/console
- Aller sur l'app `com.sportracker.app`
- Créer une nouvelle release (Production ou Internal Testing)
- Uploader le fichier :
  - Soit **AAB** (Android App Bundle) — préféré par Google
  - Soit **APK** — acceptable aussi

### 3. Pour générer un AAB au lieu d'APK
```bash
cd "E:\AI\Claude Code\sport-tracker\android"
.\gradlew.bat bundleRelease
```
Output : `android/app/build/outputs/bundle/release/app-release.aab`

### 4. Remplir les infos store
- **Nom** : Life Sport Tracker
- **Catégorie** : Santé et bien-être / Sport
- **Content rating** : Remplir le questionnaire (pas de contenu mature, pas de gambling, etc.)
- **Cibles** : Pays à sélectionner

### 5. Soumettre
- Review → Submit
- Attendre la validation Google (quelques heures à quelques jours)

---

## ⚠️ POINTS D'ATTENTION

### API Key embarquée
La clé API `<MEAL_SERVER_API_KEY-PURGED>` est dans le code source (`mealPhotoApi.ts`). Elle est extractible de l'APK. C'est acceptable car :
- Elle ne protège que l'USAGE du serveur (pas le modèle)
- Elle est révocable et rotatable côté serveur
- Le serveur est derrière HTTPS
- Pas de données personnelles sensibles transitent (juste une photo de repas)

### Permissions Android
L'app demande :
- `CAMERA` — pour prendre des photos de repas
- `INTERNET` — pour appeler le serveur
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` — pour sauvegarder les photos
- Health Connect permissions (`READ_ACTIVE_CALORIES_BURNED`, `READ_STEPS`, `READ_TOTAL_CALORIES_BURNED`)

### Performance
- L'analyse IA prend ~1-3 secondes selon la connexion (upload photo 768px + inférence serveur + retour JSON)
- Timeout configuré à 60 secondes
- Health check à 5 secondes

### Tests
- 332 tests Jest passent
- TypeScript typecheck OK
- Tests unitaires pour la logique API (pas de dépendances natives)

---

## 📋 CHECKLIST FINALE AVANT SOUMISSION

- [ ] `versionCode` incrémenté (dans `app.json` + `build.gradle`)
- [ ] `versionName` mise à jour
- [ ] Tests passent (`npm test`)
- [ ] Typecheck OK (`npx tsc --noEmit`)
- [ ] APK/AAB signé avec keystore de production
- [ ] Keystore backupé (`E:\Téléchargement\lst-release.keystore.BACKUP`)
- [ ] Privacy policy accessible en ligne
- [ ] Screenshots et feature graphic prêts
- [ ] Descriptions (short + full) rédigées
- [ ] Content rating questionnaire rempli
- [ ] Cibles pays sélectionnées
- [ ] Prix défini (gratuit ou payant)

---

## 🔗 LIENS UTILES

- **Projet mobile** : `E:\AI\Claude Code\sport-tracker`
- **Modèle v9** : `E:\AI\trainingpicssporttracker\finetune\merged-lfm450m-v9\`
- **Keystore backup** : `E:\Téléchargement\lst-release.keystore.BACKUP`
- **Play Store Console** : https://play.google.com/console
- **Privacy policy** : https://lifesporttracker.duckdns.org/privacy
- **Serveur VPS** : `ssh -i ~/.ssh/meal-server-key root@<VPS_IP-PURGED>`

---

## 🎯 MISSION POUR KIMI 3

1. Vérifier que le projet build correctement (`npm install` + `gradlew assembleRelease`)
2. S'assurer que le keystore de prod est bien utilisé (pas le debug.keystore)
3. Générer l'APK ou AAB release signé
4. Aider à remplir les infos manquantes pour le Play Store (descriptions, screenshots si besoin)
5. Uploader et soumettre la release sur le Play Store Console
6. Vérifier que tout est vert côté Google (pas d'erreurs de signing, de permissions, etc.)

**Si un problème survient** : ne pas boucler. Reporter l'erreur exacte et proposer une correction.
