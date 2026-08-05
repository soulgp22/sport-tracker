# Audit Play Store — Life Sport Tracker

**Date** : 2026-07-25 · **Périmètre** : lecture seule, aucune modification · **Cible** : publication Google Play (EAS Build)
**Stack constatée** : Expo SDK 56.0.16, React Native 0.85.3, React 19.2.3, expo-router 56.2.15, New Architecture activée, TypeScript strict.

---

## 1. Santé du projet

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | ✅ **0 erreur** (exit code 0) |
| `npx expo-doctor` | ⚠️ **20/21 checks OK** — 1 échec : versions de packages légèrement en retard. `react-native-screens` 4.25.2 (attendu ~4.26.0, **minor**) + 10 patches (`expo`, `expo-router`, `expo-notifications`, `expo-constants`, `expo-dev-client`, `expo-linking`, `expo-sharing`, `expo-splash-screen`, `expo-web-browser`, `@expo/ui`). Correctif : `npx expo install --check` |
| ESLint (`expo lint`) | ✅ **0 erreur**, 37 warnings (voir §2 et §3) |
| Jest (`npx jest`) | ✅ **34/34 suites, 218/218 tests** en 3,8 s |

### package.json — cohérence

- Toutes les deps `expo-*` sont alignées sur SDK 56 (`~56.x`) ; `react-native` 0.85.3 correspond au SDK 56. ✅
- **Versions légèrement obsolètes** : cf. expo-doctor ci-dessus. À noter : le changelog d'`expo-notifications` 55.0.8+ mentionne « improve custom sound validation (#43189) » — la mise à jour en 56.0.22 est pertinente pour le bug de son (§3.1).
- **Dépendances déclarées mais jamais importées** (recherche d'imports dans `src/`, tests inclus) :

  | Dépendance | Verdict |
  |---|---|
  | `@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-web-browser`, `expo-device`, `expo-system-ui` | **0 import** → candidats suppression (`expo-system-ui` : requis pour que `backgroundColor` racine d'app.json soit appliqué — à garder si on veut cet effet) |
  | `expo-constants`, `expo-linking` | 0 import direct mais **dépendances requises d'expo-router** → à conserver (transitives) |
  | `react-native-webview`, `react-native-web`, `react-dom` | 0 import direct mais **obligatoires pour les composants DOM Expo** (`ExerciseModelViewer.tsx`) → à conserver |
  | `three` | 0 import direct mais **peer dependency de `@google/model-viewer`** (`^0.183.0`, installé 0.185.1 ✓) → à conserver |
  | `react-native-reanimated`, `react-native-worklets` | 0 import direct mais requis par `react-native-draggable-flatlist` v4 → à conserver |

- Pas de doublon de dépendances détecté dans package.json.

---

## 2. Code mort et inutilisé

> Méthode : recherche exhaustive d'imports (`grep`) dans `src/`, tests inclus. « 0 import » = aucune référence trouvée hors définition.

### 2.1 Fichiers sources morts

| Fichier | Preuve | Taille/impact |
|---|---|---|
| `src/hooks/use-color-scheme.ts` + `src/hooks/use-color-scheme.web.ts` | **0 import** (restes du template Expo initial) | Dette mineure |
| `src/store/communityStore.ts:101-102` | Constantes `MAX_COMMUNITY_FOOD_DATABASES` / `MAX_COMMUNITY_EXERCISE_PACKS` **jamais utilisées** (confirmé ESLint) | Dette mineure |
| `src/store/communityStore.ts:176` | Fonction `readOptionalI18nMap` **jamais appelée** (confirmé ESLint) | Dette mineure |
| `src/data/exerciseMedia.ts` | Registre `exerciseMedia = {}` **vide** ; consommé à `AnimatedExerciseImage.tsx:43` mais `enhancedMedia` est donc **toujours `undefined`** → la branche `shouldUseEnhancedMedia` (lignes 55-62) est du code mort de fait | Branche entière inatteignable |
| `src/components/session/RestTimerBanner.tsx:2` | Import `View` inutilisé (ESLint) | Trivial |
| `src/lib/__tests__/restTimerNotifications.test.ts:1` | Import `Platform` inutilisé | Trivial |

### 2.2 Assets orphelins

| Asset | Preuve | Taille |
|---|---|---|
| `assets/exercises/gifs/` — **1 746 JPG** (`offline-XXX-a/b.jpg`), **trackés dans git** | **0 `require` / 0 référence dans `src/`**. Seuls des scripts de build (`scripts/build-core-media.py`, etc.) les citent : ce sont des **sources de génération**, pas des assets runtime. Non embarqués dans le bundle Metro mais **uploadés vers EAS** | **99 Mo** |
| `assets/models/offline-128.glb.bak` | **0 référence** ; extension `.bak` non couverte par `assetExts` Metro → non bundlé mais présent dans le repo et l'upload EAS | **13,4 Mo** |
| `assets/images/react-logo*.png` (×3), `expo-badge*.png` (×2), `expo-logo.png`, `logo-glow.png`, `tutorial-web.png` | **0 référence dans `src/`** (restes du template) | ~430 Ko |
| `assets/expo.icon/` (export Icon Composer iOS) | **0 référence** — `app.json:6` pointe sur `./assets/images/icon.png` | 61 Ko |

**Assets 3D vérifiés** : les 6 GLB de `src/data/exerciseModels.ts` existent tous et pèsent chacun ~2,5 Mo ✅ (2,48 / 2,50 / 2,59 / 2,48 / 2,66 / 2,53 Mo). Les 23 WebP animés de `src/data/exercises.gifs.ts` existent tous dans `assets/exercises/core/` ✅ (22 trackés, 1 non tracké).

### 2.3 Fichiers/dossiers de dev à exclure du build

| Élément | État | Risque |
|---|---|---|
| `public/__kimi_dom_test.html` | Page de test interne avec URL Metro **`http://localhost:8081` en dur**. Trackée dans git. Non embarquée dans un build natif, mais copiée par `expo export` (web static) dans `dist/` | Hygiène — **à supprimer** |
| `sport-tracker.apk` (racine) | 161 Mo, non tracké, couvert par `*.apk` du .gitignore | Encombrement local |
| `dist/` (112 Mo), `artifacts/` (206 Mo, build GitHub Actions), `media/` (51 Mo, 873 fichiers trackés — hébergement CDN GitHub raw) | `dist/` ignoré par git ; `artifacts/` et `media/` **non couverts** | **Pas de `.easignore`** → risque d'upload EAS inutile (jusqu'à ~360 Mo). Recommandé : créer `.easignore` avec `media/`, `artifacts/`, `dist/`, `public/`, `android/`, `*.apk`, `*.bak`, `assets/exercises/gifs/` |
| `test_output.txt` | **Tracké dans git** (12 Ko de logs de tests) | Hygiène repo |
| `android/` (prebuild local) | Gitignoré, mais **périmé** : généré le 18/06, avant les changements d'`app.json` (le manifest local ne contient ni `POST_NOTIFICATIONS` ni `SCHEDULE_EXACT_ALARM`, et contient `SYSTEM_ALERT_WINDOW` hérité du dev-client). Ne pas s'y fier ; EAS régénère | Confusion possible |

---

## 3. Bugs potentiels (traçabilité fichier:ligne)

### 3.1 `expo-notifications: Custom sound 'default' not found` — **cause racine identifiée**

- **Config fautive** : `src/lib/restTimerNotifications.ts:63` — `sound: 'default'` passé à `setNotificationChannelAsync('rest-timer-v3', …)`.
- **Mécanisme** (code natif d'`expo-notifications` 56.0.21) : `NotificationChannelManagerModule.kt:47-51` appelle `customSoundExists()` ; dès que la clé `sound` est présente et non nulle, `AndroidXNotificationsChannelManager.java:141-150` cherche une ressource `res/raw/default` via `SoundResolver.resourceExists()`. Or `app.json:52-58` (plugin `expo-notifications`) **ne déclare aucun tableau `sounds`** → la ressource n'existe pas → log d'erreur exactement tel qu'observé.
- **Gravité** : log d'erreur seulement — le canal est créé et `SoundResolver.resolve()` retombe sur `DEFAULT_NOTIFICATION_URI` (`SoundResolver.kt:39`). Le son fonctionne, mais l'erreur pollue LogBox en dev et peut inquiéter en prod.
- **Correctif recommandé** : supprimer `sound: 'default'` de la config du canal (l'absence de clé = son par défaut, cf. `createSoundUriFromArguments` ligne 155-156), ou mettre à jour `expo-notifications` en 56.0.22 qui améliore la validation des sons.
- **Incohérence annexe (P1)** : `app.json:56` déclare `"defaultChannel": "rest-timer-v2"` alors que le code crée **`rest-timer-v3`** (`restTimerNotifications.ts:10`). Le canal v2 référencé par la meta-data Firebase n'existe plus → à aligner (v3) ou supprimer la clé.
- `sound: 'default'` dans le **contenu** de notification (`restTimerNotifications.ts:37`) est une valeur documentée et valide → à conserver.

### 3.2 `DomWebView.injectJavaScript` (composant DOM démonté)

- `ExerciseModelViewer.tsx` ne gère pas le démontage — c'est **impossible côté userland** : le pont `injectJavaScript` est interne à l'infra DOM d'Expo. L'erreur survient quand une mise à jour de props est en vol pendant le démontage de la WebView (navigation retour).
- **Facteur aggravant local** : `ExerciseModel3D.tsx:40` recrée l'objet `dom={{ style: { width, height } }}` **à chaque render** → chaque re-render du parent (`ExerciseDetailView.tsx:46`) déclenche une propagation de props vers la WebView, augmentant la fenêtre de course avec le démontage.
- **Mitigation recommandée** : mémoriser la prop `dom` avec `useMemo` (et idéalement la prop `src`/`uri`, `ExerciseModel3D.tsx:23` recalculé à chaque render). La mesure `onLayout` est déjà correctement gardée (`ExerciseModel3D.tsx:28`).
- Bon point : le viewer n'est monté qu'après mesure (`size ? … : null`, ligne 35-42), ce qui évite le cas 0×0.

### 3.3 Permissions / manifest

- **`SCHEDULE_EXACT_ALARM`** (`app.json:19`) : **aucune utilisation dans le code** (recherche `exact`/`SCHEDULE_EXACT` dans `src/` = 0 résultat ; les notifications planifiées utilisent des triggers DATE/TIME_INTERVAL ordinaires). C'est une **permission restreinte Google Play** (formulaire de déclaration obligatoire, réservée aux apps alarme/calendrier) → **risque de rejet ou de suspension**. À supprimer.
- `expo-notifications` ajoutera en build prod : `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `VIBRATE` — toutes justifiées par le minuteur de repos.
- `READ/WRITE_EXTERNAL_STORAGE` (maxSdk 32) observées dans le manifest local périmé — proviennent des plugins document-picker/sharing ; à revérifier sur le manifest du build de production.
- `SYSTEM_ALERT_WINDOW` : présent uniquement via `expo-dev-client` (dev) ; absent du profil production.

### 3.4 Fuites / null-safety — revue ciblée

- `useRestTimer.ts` : intervalle nettoyé (l.62-64), souscription `AppState` retirée (l.126), garde de génération anti-course pour les notifications (l.68-101). ✅ Point faible mineur : au **démontage avec minuteur actif**, la notification « ongoing » n'est pas dismissée (le cleanup l.62 ne fait que `clearInterval`) — l'écran actif ne se démonte quasiment jamais avec un timer en cours, impact faible.
- `restTimerNotifications.ts` : toutes les promesses sont catchées (12 blocs `try/catch`), file de sérialisation `runNotificationOperation` correcte. ✅
- `AnimatedExerciseImage.tsx:65-98` : la boucle d'animation crossfade démarre dès qu'il existe une source bundlée, **sans tenir compte de la prop `animate`** — dans `ExerciseCatalogList.tsx:58` (`animate={false}`), chaque ligne visible avec WebP bundlé lance quand même une boucle `Animated.loop`. Nettoyage présent (l.94-97) mais CPU/batterie gaspillés. **Bug perf fonctionnel (P2).**

---

## 4. Performance

### 4.1 Assets

| Élément | Mesure | Verdict |
|---|---|---|
| 6 GLB (`assets/models/`) | 2,48 – 2,66 Mo chacun | ✅ conforme à l'objectif ~2,5 Mo |
| `offline-128.glb.bak` | 13,4 Mo | ❌ mort, à supprimer |
| 23 WebP animés (`core/`) | 1,8 Mo total | ✅ |
| 1 746 JPG (`gifs/`) | 99 Mo | ❌ orphelins (non bundlés, mais repo/upload EAS) |
| `logo-glow.png` | 331 Ko, non référencé | ❌ à supprimer |
| Icônes/splash/notification | 1,8 – 37 Ko | ✅ |

### 4.2 Rendu

- `ExerciseCatalogList.tsx` : `FlatList` virtualisée avec `keyExtractor` (l.130, 151) ✅. Pas de tuning (`initialNumToRender`, `windowSize`) — défauts acceptables. Les rows ne sont pas `React.memo` : un changement de sélection re-rend toutes les rows visibles (P3).
- `app/_layout.tsx:46-65` : **18 polices chargées au démarrage** (5 familles) — coût de démarrage et mémoire non négligeables ; envisager de restreindre aux graisses réellement utilisées (P3).
- `AnimatedExerciseImage` : boucle d'animation non gatillée par `animate` (§3.4) — principal point perf.
- `ExerciseModel3D.tsx:23` : `Asset.fromModule(model).uri` recalculé à chaque render (coût faible, mais à mémoriser avec la prop `dom`).
- Aucun import lourd anormal en haut de fichier ; `@google/model-viewer` n'est chargé que dans le bundle DOM (séparé). ✅

---

## 5. Conformité Play Store

| Exigence | État | Détail |
|---|---|---|
| `android.package` | ✅ | `com.sportracker.app` (`app.json:16`) |
| `version` / `versionCode` | ⚠️ | `version: "1.0.0"` ✓ ; **pas de `android.versionCode` dans app.json** — le build.gradle local fixe `versionCode 1`, mais le profil `production` d'`eas.json` a `autoIncrement: true` (gestion distante EAS) → fonctionnel, à documenter |
| Icône adaptive | ✅ | foreground/background/monochrome définis (`app.json:21-26`), fichiers présents |
| Splash | ✅ | plugin `expo-splash-screen` configuré (`app.json:36-45`), `splash-icon.png` présent |
| Icône notification | ✅ | `notification-icon.png` (1,8 Ko) + couleur `#1677FF` (`app.json:52-56`) |
| Permissions | ⚠️ | `SCHEDULE_EXACT_ALARM` **injustifiée et restreinte Play** → risque de rejet (§3.3). Le reste est standard |
| Plugin expo-notifications | ⚠️ | `defaultChannel: "rest-timer-v2"` ≠ canal réel `rest-timer-v3` ; pas de tableau `sounds` (cause du log §3.1) |
| `eas.json` | ✅ | 3 profils (development/preview/production), production = **app-bundle (AAB)** ✓, `channel: "production"`, section `submit` présente, `projectId` EAS configuré |
| 64-bit | ✅ | `reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64` (gradle.properties local) ; l'AAB EAS inclura arm64-v8a |
| targetSdk récent | ✅ | SDK 56 → **targetSdk 36 (Android 16)**, minSdk 24 (défauts `expo-module-gradle-plugin`, `ProjectConfiguration.kt:72-77`) |
| `android:exported` / intent-filters / scheme | ✅ | `scheme: "sport-tracker"` (`app.json:7`), `MainActivity exported="true"` avec intent-filter du scheme (manifest local) ; géré par Expo en prebuild prod |
| New Architecture / Hermes | ✅ | `newArchEnabled=true`, `hermesEnabled=true` |
| **WebP animé** | ⚠️ | `expo.webp.animated=false` dans `android/gradle.properties` local — si cette valeur persiste au prebuild de prod, **les animations d'exercices seront statiques sur Android** (le défaut du template Expo est `true`). À vérifier impérativement sur le build EAS (regénéré) ou à forcer |
| `expo-dev-client` en prod | ✅ | Non inclus dans le profil production d'eas.json |
| Page de test `__kimi_dom_test.html` | ✅ (natif) | Non embarquée dans le build natif ; à supprimer par hygiène |

---

## 6. Plan d'action priorisé

| # | Action | Fichier(s) | Priorité | Effort | Risque régression |
|---|---|---|---|---|---|
| 1 | Supprimer la permission restreinte `SCHEDULE_EXACT_ALARM` (aucun usage code) | `app.json:19` | **P0** | S | Faible |
| 2 | Aligner `defaultChannel` sur `rest-timer-v3` (ou supprimer la clé) | `app.json:56` ↔ `restTimerNotifications.ts:10` | **P0** | S | Faible |
| 3 | Supprimer `sound: 'default'` de la création du canal (cause racine du log « Custom sound 'default' not found ») | `restTimerNotifications.ts:63` | **P1** | S | Faible |
| 4 | Vérifier/forcer `expo.webp.animated=true` sur le build de prod (sinon animations statiques) | `android/gradle.properties` (régénéré par prebuild) | **P1** | S | Moyen |
| 5 | Mettre à jour les 11 packages (`npx expo install --check`), dont `expo-notifications` 56.0.22 et `react-native-screens` 4.26 | `package.json` | **P1** | S | Moyen (refaire tourner les 218 tests) |
| 6 | Mémoriser `dom` (et `uri`) via `useMemo` pour réduire les erreurs `DomWebView.injectJavaScript` | `ExerciseModel3D.tsx:23,40` | **P1** | S | Faible |
| 7 | Créer `.easignore` : `media/ artifacts/ dist/ public/ android/ *.apk *.bak assets/exercises/gifs/` | racine | **P1** | S | Faible |
| 8 | Supprimer `public/__kimi_dom_test.html` (URLs localhost en dur) | `public/__kimi_dom_test.html` | P2 | S | Faible |
| 9 | Supprimer `offline-128.glb.bak` (13,4 Mo) et les images template orphelines (~430 Ko) | `assets/models/`, `assets/images/` | P2 | S | Faible |
| 10 | Sortir `assets/exercises/gifs/` (99 Mo) du repo ou les exclure de l'upload (sources de scripts uniquement) | `assets/exercises/gifs/`, `.easignore` | P2 | M | Faible |
| 11 | Gâtiller la boucle d'animation par la prop `animate` | `AnimatedExerciseImage.tsx:65-98` | P2 | S | Moyen |
| 12 | Dismiss la notification « ongoing » au démontage du hook | `useRestTimer.ts:62-64` | P2 | S | Moyen |
| 13 | Retirer les dépendances non utilisées (`@expo/ui`, `expo-glass-effect`, `expo-symbols`, `expo-web-browser`, `expo-device`) | `package.json` | P2 | S | Moyen (relancer tsc + tests + un build) |
| 14 | Nettoyer code mort : `use-color-scheme*`, constantes/fonction inutilisées de `communityStore.ts`, branche `exerciseMedia` vide, imports inutilisés | cf. §2.1 | P2 | S | Faible |
| 15 | Retirer `test_output.txt` du suivi git | `test_output.txt` | P3 | S | Faible |
| 16 | Déclarer `android.versionCode` explicitement (lisibilité) même si `autoIncrement` gère | `app.json` | P3 | S | Faible |
| 17 | Réduire les 18 polices chargées au démarrage ; `React.memo` sur `ExerciseRow` ; warnings ESLint restants (37) | `app/_layout.tsx`, `ExerciseCatalogList.tsx`, divers | P3 | M | Moyen |

---

## Annexe — commandes exécutées (lecture seule)

- `npx tsc --noEmit` → exit 0
- `npx expo-doctor` → 20/21, 1 échec (versions packages)
- `npx expo lint` → 0 erreur, 37 warnings
- `npx jest --silent` → 34 suites / 218 tests OK
- Inventaires `assets/`, `git ls-files`, greps d'imports/permissions/secrets (aucun secret ni URL réseau local dans `src/` hors page de test)


---

## Modifications effectuées (25/07/2026)

Correctifs appliqués dans le périmètre autorisé (P0 ×2, P1 ×2, P2 console.log). Aucune autre modification.

| # | Fichier | Avant | Après | Justification | Vérification |
|---|---|---|---|---|---|
| 1 | `app.json:18-20` | `"permissions": ["android.permission.SCHEDULE_EXACT_ALARM"]` | Bloc `permissions` supprimé | Permission restreinte Google Play, **0 usage dans le code** (recherche globale refaite avant modification : seule occurrence = la déclaration elle-même, dans `src/`, `scripts/`, configs et `community/`) | `app.json` re-parsé en JSON ✓ ; `tsc --noEmit` exit 0 ✓ |
| 2 | `app.json:56` | `"defaultChannel": "rest-timer-v2"` | `"defaultChannel": "rest-timer-v3"` | Alignement avec le canal réel créé par le code (`src/lib/restTimerNotifications.ts:10`, `REST_TIMER_CHANNEL_ID = 'rest-timer-v3'`) ; la meta-data Firebase pointait vers un canal inexistant | `tsc --noEmit` exit 0 ✓ |
| 3 | `src/lib/restTimerNotifications.ts:63` | `sound: 'default',` dans `setNotificationChannelAsync` | Clé `sound` retirée (+ commentaire expliquant la cause) | Correction minimale et sûre : sans clé `sound`, `createSoundUriFromArguments` utilise `Settings.System.DEFAULT_NOTIFICATION_URI` (= son système par défaut, comportement identique), et `customSoundExists()` court-circuite → fin du log « Custom sound 'default' not found ». Le `sound: 'default'` du **contenu** de notification (l.37) est documenté et valide → conservé | `tsc --noEmit` exit 0 ✓ ; suite complète `jest` : **34/34 suites, 218/218 tests** (dont `restTimerNotifications.test.ts`) ✓ |
| 4 | `.easignore` (créé) | Fichier absent | 13 règles d'exclusion : `artifacts/`, `dist/`, `*.apk`, `*.aab`, `media/`, `assets/exercises/gifs/`, `*.bak`, `public/__kimi_dom_test.html`, `android/`, `ios/`, `docs/`, `*.md`, `scripts/`, `__mocks__/`, configs jest/eslint, `test_output.txt` | Évite ~360 Mo d'upload EAS inutile identifiés à l'audit (§2.3). **Aucun fichier supprimé du disque** — exclusions d'upload uniquement. `tsconfig.json` et `metro.config.js` volontairement NON exclus (lus par Metro au bundling). Vérifié au préalable : 0 import `@/…` et 0 import runtime depuis `scripts/` | Fichier créé à la racine ✓ ; `tsc` et tests relancés après → verts ✓ |
| 5 | — (console.log) | — | **Aucune modification** | Recherche exhaustive `console.(log\|debug\|info)` dans `src/**/*.ts(x)` : **0 occurrence**. Rien à supprimer | — |

**Résultat final des vérifications** : `npx tsc --noEmit` → exit 0 · `npx jest` → 34 suites / 218 tests, tous verts. Aucune correction n'a cassé de test ; aucun revert nécessaire.

**Reste à faire (hors périmètre autorisé)** : `expo.webp.animated=true` à valider sur le build EAS de prod (P1-4), mise à jour des 11 packages `expo install --check` (P1-5), mémorisation de la prop `dom` dans `ExerciseModel3D.tsx` (P1-6), puis plan §6 P2/P3.
