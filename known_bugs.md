# known_bugs.md — Bugs rencontrés et comment ne pas les refaire

> Un bug corrigé s'écrit ici **et** donne un test dans [Tests.md](Tests.md).
> Lire ce fichier **avant** de diagnostiquer : le symptôme est peut-être déjà connu.
> Format : symptôme observable → cause racine → correctif → comment l'éviter.

---

## Le motif qui revient : l'erreur avalée en silence

**Trois bugs distincts, une même mécanique.** Une exception réelle est attrapée par
un `catch` qui la transforme en état d'apparence normale. Le défaut devient
invisible et survit des jours.

| Symptôme | Erreur avalée par |
|---|---|
| Écran blanc au démarrage | le `.catch()` interne du middleware `persist` de zustand |
| Health Connect toujours déconnecté | `catch { return null }` de `safeCall` |
| Bundles DOM accumulés | Gradle qui ignore un dossier produit par un outil tiers |

**Règle :** un `catch` qui renvoie une valeur de repli doit **journaliser** l'erreur
(au moins sous `__DEV__`). Le repli reste identique, mais l'échec cesse d'être muet.

---

## 1. L'app se lance et se ferme immédiatement (1.3.1)

**Symptôme** — écran de démarrage, puis le processus meurt. Aucun message.

**Cause** — `expo-navigation-bar` installé en version **canary**
(`56.0.4-canary-20260701`). Son `NavigationBarModule` implémentait
`com.facebook.react.interfaces.ExtraWindowEventListener`, interface absente de
React Native 0.85.3. Expo instancie **tous** ses modules natifs d'un bloc dans
`MainApplication.onCreate` : un seul module irrésolvable fait tomber l'application
entière, avant la première ligne de JavaScript.

```
java.lang.NoClassDefFoundError: Failed resolution of:
  Lexpo/modules/navigationbar/NavigationBarModule;
```

**Correctif** — épingler `expo-navigation-bar` en `56.0.3` (dernière stable).

**À éviter** — ne jamais installer de version canary/beta/rc. Le paquet a fini par
être retiré complètement en 1.3.7.

---

## 2. L'onboarding se relance à chaque démarrage

**Symptôme** — l'onboarding réapparaît alors qu'il a été complété.

**Cause** — la fonction `merge` du middleware `persist` retournait
`{ ...current, profile }`. `current` étant l'état initial (`completed: false`), le
champ `completed` sauvegardé n'était **jamais** restauré. La donnée était bien
écrite sur le disque, elle était ignorée à la relecture.

**Correctif** — restaurer explicitement chaque champ de `partialize`, avec repli
typé. Voir `src/store/onboardingStore.ts`.

**À éviter** — dans un `merge` personnalisé, **tout** champ de `partialize` doit
être restauré explicitement. Vérifier les autres stores persistés.

---

## 3. Écran blanc infini au démarrage

**Symptôme** — indicateur de chargement qui tourne indéfiniment, aucune erreur.

**Cause** — `merge` accédait à `persisted.profile` sans vérifier que `persisted`
soit un objet. Zustand peut l'appeler avec `undefined`, `null` ou un format
ancien. L'exception était avalée par le `.catch()` du middleware :
`onFinishHydration` n'était jamais appelé, `hasHydrated` restait faux pour
toujours.

**Correctif** — trois couches : `merge` défensive qui ne peut plus lever,
`onRehydrateStorage` (appelé sur le chemin succès **et** erreur), et un délai de
sécurité de 5 s si le stockage ne répond jamais.

**À éviter** — toute fonction appelée par un middleware qui avale les exceptions
doit être incapable de lever.

---

## 4. Le bandeau de boutons recouvre le texte des dialogues

**Symptôme** — sur une modale à message long, le bouton « Confirmer » s'affiche
par-dessus le texte.

**Cause** — `card: { maxHeight: '82%' }` alors que le parent `safe` n'avait
**aucune hauteur propre**. Un pourcentage se résout contre la hauteur du parent :
sans hauteur, il ne se résout pas et la carte croît sans limite. Un `flexShrink`
sur un enfant n'a alors rien à comprimer.

**Correctif** — hauteur absolue dérivée de `useWindowDimensions()`.

**À éviter** — un premier correctif (`flexShrink: 1`) traitait le symptôme et avait
été validé sur un diff et des tests verts. **Le bug persistait sur l'appareil.**
Une contrainte en pourcentage exige un parent dimensionné.

---

## 5. L'app n'apparaît pas dans Health Connect

**Symptôme** — impossible d'accorder les permissions santé : l'app n'est pas dans
la liste de Health Connect.

**Cause** — le manifeste n'exposait que
`androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`, valable pour Android 13 avec
l'APK Health Connect séparé. Depuis **Android 14 (API 34)**, Health Connect est
intégré au système et ne liste que les applications exposant un `activity-alias`
avec `VIEW_PERMISSION_USAGE` + catégorie `HEALTH_PERMISSIONS`.

**Correctif** — passe `withAndroidManifest` dans `plugins/withHealthConnect.js`.

**À éviter** — « le code appelle l'API » ne veut pas dire « la fonctionnalité
marche ». Vérifier le manifeste **compilé** :
`aapt2 dump xmltree <apk> --file AndroidManifest.xml`.

---

## 6. Health Connect redemande la permission à chaque ouverture

**Symptôme** — le bouton « Connecter » revient à chaque lancement, et les données
restent à 0.

**Cause** — le SDK `react-native-health-connect` exige `initialize()` avant tout
appel. Il était appelé dans `requestPermissions` et `readCalories`, mais **pas**
dans `hasHealthPermissions`. L'appel levait, `safeCall` avalait l'exception et
retournait `null` → l'app concluait que la permission manquait, puis sortait de la
fonction **avant** de lire les données.

**Une seule cause, deux symptômes** : le second n'était qu'une conséquence du premier.

**Correctif** — helper `ensureInitialized(hc)` mémoïsé, appliqué partout.

---

## 7. L'APK grossit de ~8,5 Mo à chaque build

**Symptôme** — APK de 286 Mo contenant quatre copies du même bundle.

**Cause** — le viewer 3D est un composant DOM (`'use dom'`). Expo le compile en
bundle web écrit dans `android/app/build/generated/assets/react/<variante>/www.bundle/`,
sous un nom **haché qui change à chaque build**. Le dossier n'étant jamais vidé, le
nouveau fichier s'ajoutait à côté de l'ancien, et le packaging embarquait tout.

**Correctif** — `plugins/withCleanDomBundle.js` injecte une tâche Gradle qui vide
`www.bundle` avant chaque bundling. Versionné, donc valable sur toute machine et
sur EAS.

**À éviter** — un nettoyage manuel ne tient pas : `android/` est gitignoré.

---

## 8. `three` n'est pas une dépendance morte

**Symptôme** — après retrait de `three`, le bundling Metro échoue :
`Unable to resolve module three from @google/model-viewer`.

**Cause** — `@google/model-viewer` ne l'embarque pas, il le déclare en
`peerDependency` (`^0.183.0`).

**À éviter** — un paquet absent des imports du projet peut être **requis par une
dépendance**. Vérifier les `peerDependencies` avant de supprimer.

---

## 9. Les images des exercices ne s'affichent pas

**Symptôme** — catalogue sans illustrations.

**Cause** — trois causes empilées : seulement 22 exercices avaient une image
embarquée, `exerciseMedia` était un objet vide, et les URL pointaient vers un
dossier **suivi par Git LFS** — `raw.githubusercontent.com` renvoyait alors un
fichier pointeur de 130 octets au lieu de l'image.

**À éviter** — vérifier qu'une URL de média renvoie de vrais octets :

```bash
curl -sL "$MEDIA_BASE/offline-529.webp" | head -c 8 | grep -q RIFF \
  || echo "ERREUR: pointeur LFS ou fichier invalide"
```

---

## 10. Test dépendant de l'horloge réelle

**Symptôme** — un test passait le 14 juillet, échouait tous les autres jours.

**Cause** — fixtures à dates figées confrontées à `new Date()` dans le code testé.

**Correctif** — `now` injectable, valeur par défaut inchangée en production.

**À éviter** — aucun test ne doit dépendre de l'horloge, du réseau ou de l'ordre
d'exécution.

---

## 11. Un texte d'aide envoie vers un écran qui ne contient plus le champ

**Symptôme** — sur l'écran Nutrition, la carte « Bilan du jour » affiche
« Il manque : ton sexe. » et un bouton « Compléter mon profil ». Le bouton menait
aux **Réglages**, où le champ sexe n'existait plus : il venait d'être déplacé vers
le nouvel écran `/(tabs)/profile`. L'utilisateur atterrissait sur un écran qui ne
contenait pas ce qu'on venait de lui demander.

**Cause** — une destination de navigation écrite en dur
(`router.push('/(tabs)/settings')`) est restée en place quand les champs qu'elle
visait ont déménagé. Rien ne reliait les deux : ni le type, ni un test.

**Correctif** — destination extraite dans `src/constants/routes.ts`
(`PROFILE_COMPLETION_DESTINATION`) et couverte par un test qui rougit si l'on
remet l'ancienne valeur.

**À éviter** — quand un champ change d'écran, chercher **tous** les endroits qui
invitent à le renseigner, pas seulement ceux qui l'affichent. Un `grep` sur le nom
du champ ne suffit pas : ces invitations le nomment en langage naturel, dans les
traductions.

---

## 12. Une traduction nomme un onglet supprimé

**Symptôme** — l'état vide de l'écran Séance affichait « Créez d'abord un programme
**dans l'onglet Programmes** », alors que cet onglet venait d'être retiré de la
barre de navigation.

**Cause** — la clé `session.noProgramsSubtitle` a été *réutilisée* lors du
remaniement de la navigation, sans que son contenu soit relu. Les tests de parité
i18n vérifient qu'une clé existe dans les 4 langues, jamais que son texte est
encore vrai.

**Correctif** — reformuler dans les 4 langues pour décrire **l'action**
(« Créez d'abord un programme pour démarrer une séance. ») plutôt que de nommer un
emplacement de l'interface.

**À éviter** — ne jamais nommer un onglet, un menu ou une position d'écran dans un
texte : ces mots deviennent faux au premier remaniement. Décrire l'action, qui
reste vraie quel que soit le chemin. Après toute modification de navigation,
relire les textes des états vides — aucun test ne peut les valider.

---

## 13. Un module de données placé dans le répertoire de routes

**Symptôme** — pas de défaut visible, mais `src/app/(tabs)/homeTiles.ts` et
`src/app/(tabs)/__tests__/` avaient été créés pour rendre une constante testable.

**Cause** — `src/app/` est le répertoire de routes d'expo-router : chaque fichier y
est interprété comme une page. Un module sans export par défaut y provoque un
avertissement de route invalide, et un fichier de **test** s'y retrouve embarqué
dans l'application publiée.

**Correctif** — déplacer vers `src/constants/`, qui accueille déjà `meals.ts`,
`colors.ts`, `equipmentProfiles.ts` et son propre répertoire `__tests__`.

**À éviter** — vérifier avant d'ajouter un fichier dans `src/app/` :

```bash
find src/app -type f ! -name "*.tsx"   # doit rester vide
find src/app -type d -name "__tests__" # doit rester vide
```

---

## Pièges d'outillage (pas des bugs applicatifs)

- **`adb emu kill` peut répondre OK sans tuer le processus.** Vérifier
  `tasklist | grep qemu` et forcer avec `taskkill //F //IM qemu-system-x86_64.exe`.
- **Health Connect *est* testable sur émulateur** : l'image Android 15 l'embarque
  via APEX. Ouvrir avec
  `adb shell am start -a android.health.connect.action.HEALTH_HOME_SETTINGS`.
- **Tester le mode trois boutons** (configuration la plus courante) :
  `adb shell cmd overlay enable com.android.internal.systemui.navbar.threebutton`.
- **Ne jamais filtrer la sortie d'un build** (`| tail`, `| grep`) : en cas
  d'échec, le message d'erreur est perdu. Rediriger vers un fichier.
- **`npm` standard est cassé sur cette machine** : utiliser celui de kimi-desktop.

---

## Le garde-fou de média cachait l'animation de 850 exercices

**Symptôme** — l'écran de séance affichait une bande grise vide de 150 dp
au-dessus de la liste des exercices, et l'écran de détail restait souvent muet.

**Cause** — le test de disponibilité du média, dupliqué dans
`ExerciseDetailView` et repris tel quel ailleurs :

```ts
Boolean(exerciseGifs[id] || exerciseMedia[id] || exercise.remoteMediaBaseUrl)
```

est beaucoup plus restrictif que le composant qu'il protège. Mesures :
`exerciseGifs` ne contient que **23** entrées groupées, `exerciseMedia` est un
objet **vide** (`= {}`), et `remoteMediaBaseUrl` n'est renseigné que pour les
exercices installés depuis un pack communautaire (`communityStore.ts`). Or
`AnimatedExerciseImage` retombe seul sur `DEFAULT_EXERCISE_MEDIA_BASE_URL` :

```
curl -sI .../media/exercises/offline-001.webp  → 200, 48 850 octets, RIFF/WEBP
curl -sI .../media/exercises/offline-010.webp  → 200, 67 450 octets
curl -sI .../media/exercises/offline-100.webp  → 200, 93 780 octets
```

873 fichiers y sont servis. Le garde-fou masquait donc ce qui existait.

**Correctif** — inverser la logique : afficher par défaut, masquer seulement
après échec réel. `AnimatedExerciseImage` reçoit une prop optionnelle
`onUnavailable`, appelée depuis un effet (jamais pendant le rendu), et le parent
retire son cadre à ce moment-là.

**À éviter** — ne pas dupliquer un test de disponibilité en amont d'un composant
qui sait déjà décider. Le bon critère n'est pas « je sais d'avance qu'un média
existe » mais « le composant a essayé et a échoué ».

## Un bloc placé entre l'en-tête et les branches d'onglets s'affiche partout

**Symptôme** — « POIDS ACTUEL 93 KG » visible sur les trois onglets de
Progression, y compris Exercices et Niveaux.

**Cause** — dans `progress/index.tsx`, le bloc était écrit entre la rangée
d'onglets et le premier `mode === …`. Il n'appartenait donc à aucune branche.
Il n'y avait pas de condition fautive à corriger : il fallait déplacer le bloc.

**À éviter** — dans un écran à onglets rendu par une chaîne de ternaires, tout
ce qui est écrit avant la chaîne est un en-tête partagé. Vérifier à l'écran, pas
seulement dans le code : un test qui ne monte qu'un seul onglet ne voit rien.

## `app.json` n'est pas la source du numéro de version Android

Rappel : `android/` est généré et gitignoré, Gradle lit
`android/app/build.gradle` (`versionCode`, `versionName`). Modifier les DEUX
avant publication, puis vérifier sur l'appareil :

```bash
adb shell dumpsys package com.sportracker.app | grep -E "versionCode|versionName"
```

## Pièges d'émulateur rencontrés le 2026-08-16

- **Un APK debug ne s'installe pas par-dessus un build release**
  (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) : signatures différentes. Désinstaller
  d'abord — ce qui efface les données de l'app.
- **Le dev-client n'ouvre pas le bundle tout seul** : il affiche son lanceur.
  Passer par le schéma de l'app, pas par `expo-development-client` :
  `adb shell am start -a android.intent.action.VIEW -d "sport-tracker://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"`
- **La bulle flottante du dev-client masque le bouton d'en-tête droit.**
  La déplacer par un `input swipe` avant de viser un `+` ou un engrenage.

## Deux navigations concurrentes laissent un écran blanc sans issue

**Symptôme** — terminer une séance amenait sur un écran « Séance » sans barre
d'onglets, avec une flèche retour ; appuyer sur cette flèche donnait un écran
**totalement vide** (dump uiautomator : 0 élément cliquable, 0 texte). Seul le
bouton retour matériel d'Android permettait d'en sortir.

**Cause** — dans `session/active.tsx`, deux navigations partaient pour le même
événement. `handleFinish` appelait `finishSession()` (qui met `active` à `null`)
puis `router.replace('/(tabs)/history')`. Mais l'effet de garde

```ts
useEffect(() => { if (!active) router.replace('/(tabs)/session'); }, [active, router]);
```

réagissait au même passage à `null` et lançait un **second** `replace`. C'est lui
qui empilait un écran Séance au-dessus du navigateur d'onglets — d'où la barre du
bas disparue — et la flèche retour dépilait alors vers la route `active` désormais
sans séance, qui ne rend rien.

Cause aggravante : `session/_layout.tsx` déclarait `BackToHomeButton` **sans jamais
le brancher**, contrairement aux 7 autres layouts qui font tous
`headerLeft: () => <BackToHomeButton />`. L'écran utilisait donc la flèche par
défaut du Stack, qui dépile aveuglément.

**Correctif** — un `leavingRef` passé à `true` avant `finishSession()` et
`cancelSession()`, testé dans l'effet (`if (!active && !leavingRef.current)`), et
le `headerLeft` enfin branché.

**À éviter** — quand un handler navigue *et* modifie un état qu'un effet surveille
pour naviguer aussi, les deux partent. Le symptôme visible (écran blanc) est à deux
sauts de la cause (double `replace`) : ne pas corriger l'écran d'arrivée.

## Un écran de chargement sans bouton d'abandon est un cul-de-sac

**Symptôme** — Nutrition > Appareil photo, serveur d'analyse injoignable :
« Chargement du modèle IA… » restait affiché indéfiniment, sans croix, sans
en-tête, sans bouton. Aucune sortie par l'interface.

**Cause** — dans `MealPhotoReview.tsx`, la branche `screen === 'loading'` ne rendait
qu'un `ActivityIndicator` et un `Text`, alors que la branche `screen === 'capture'`
juste en dessous possédait, elle, un bouton `common.cancel` câblé sur `requestClose`.
L'affordance existait, elle n'avait pas été reportée sur l'état voisin.

**À éviter** — vérifier que **chaque** état d'un composant à états offre une sortie.
Un `onRequestClose` sur la `Modal` ne suffit pas : il ne couvre que le retour
matériel Android, invisible pour l'utilisateur.

## Un message d'erreur technique brut livré en production

**Symptôme** — la modale d'échec d'analyse affichait littéralement
`fetch failed: Fetch request has been canceled`.

**Cause** — `MealPhotoReview.tsx` concaténait volontairement `engineError.message`
au message utilisateur, avec un commentaire assumant le choix (« le message
générique masque la cause réelle »). Utile en développement, mais livré à tous.

**Correctif** — le détail part dans `console.warn`, l'utilisateur ne voit que le
message traduit.

**À éviter** — une affordance de débogage volontaire doit être conditionnée à
`__DEV__` ou envoyée dans les logs, jamais rendue à l'écran par défaut.

## Un `SafeAreaView` sans `edges: top` sous un `headerShown: false`

**Symptôme** — le titre « HISTORIQUE / Activité » se superposait à l'heure et aux
icônes système.

**Cause** — `history/_layout.tsx` déclare `headerShown: false` (l'écran dessine son
propre en-tête), mais `history/index.tsx` ouvrait
`<SafeAreaView edges={['bottom']}>` : aucune marge haute, le contenu démarrait à
y=0.

**À éviter** — dès qu'un écran passe en `headerShown: false`, ses `edges` doivent
inclure `'top'`. Le défaut ne se voit qu'à l'écran : RNTL ne calcule aucune mise en
page et ne peut pas l'attraper.

## Un compteur toujours au pluriel, alors que le motif correct existait déjà

**Symptôme** — « 1 exercices » dans l'onglet Séance, alors que l'écran Programmes
affichait correctement « 1 exercice » pour la même donnée.

**Cause** — `session/index.tsx` utilisait `session.dayExercises`, dont la valeur est
figée au pluriel dans les 4 langues. Le projet possédait pourtant déjà
`program.exerciseCount.one` / `.other` et le motif
`t(n !== 1 ? '...other' : '...one', { count: n })`, utilisé dans `programs/[id]/index.tsx`.

**À éviter** — chercher le motif existant avant d'ajouter une clé. Ici la
correction n'a demandé **aucune** nouvelle traduction.

## Le minuteur de repos n'était pas internationalisé du tout

**Symptôme** — non visible en français. En anglais, espagnol ou allemand, le
minuteur affiché à chaque série restait en français : « REPOS », « RESTANT »,
« Passer », « Série 1 / 3 », « Précédente : … ».

**Cause** — `RestTimerModal.tsx` n'importait même pas `useTranslation` : tous ses
textes étaient des littéraux français.

**Pourquoi les tests ne l'ont pas vu** — le test de parité i18n compare les **clés
déclarées** entre les 4 langues. Un texte en dur ne passe par aucune clé : il est
invisible pour ce test, par construction. La parité était verte et le composant
monolingue.

**À éviter** — la parité des clés ne prouve pas l'internationalisation. Pour le
vérifier, rendre un écran avec `language: 'en'` et assurer qu'aucun mot français
n'y apparaît.
