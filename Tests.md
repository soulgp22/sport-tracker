# Tests.md — Stratégie de test

> **Règle fondatrice : un bug corrigé = un test qui l'aurait attrapé.**
> Le bug s'écrit dans [known_bugs.md](known_bugs.md), le test s'écrit ici et dans le code.
> Le portail complet avant publication : [docs/tests-avant-prod.md](docs/tests-avant-prod.md).

---

## Les deux règles qui décident de tout

### 1. Un test qui ne peut pas échouer ne prouve rien

Après avoir écrit un test de régression, **réintroduire volontairement le défaut**
et vérifier qu'il rougit. Puis restaurer.

C'est non négociable : un test de dialogue avait été écrit, validé, commité — il
passait **avant comme après** le correctif. Il ne prouvait rien, et le bug est
resté en production.

```bash
cp src/lib/monModule.ts /tmp/sauvegarde.bak
# réintroduire le défaut
npx jest src/lib/__tests__/monModule.test.ts --ci   # doit ROUGIR
cp /tmp/sauvegarde.bak src/lib/monModule.ts
```

Attendu : **exactement** les tests visés rougissent, les voisins restent verts. Si
tout rougit, le test est trop large ; si rien ne rougit, il est inutile.

### 2. Aucune dépendance à l'horloge, au réseau ou à l'ordre

Un test qui passait le 14 juillet et échouait les autres jours a failli bloquer la
CI. Toute date doit être injectée, jamais lue depuis `new Date()` dans le code
testé.

---

## Commandes

| Quoi | Commande |
|---|---|
| Typage | `npx tsc --noEmit` |
| Tests | `npx jest --ci` |
| Un fichier | `npx jest <chemin> --ci` |
| Lint | `npm run lint` |

⚠️ Utiliser le `npx` de kimi-desktop (le npm standard est cassé sur cette machine).

**État actuel : 43 suites / 347 tests.** Toute baisse du total doit être
**explicable** — nombre exact de cas retirés, et pourquoi. Une baisse inexpliquée
est une régression déguisée.

---

## Ce qui est couvert

| Domaine | Fichier | Ce qu'il protège |
|---|---|---|
| Hydratation du store | `src/store/__tests__/onboardingStore.test.ts` | `merge` ne peut plus lever, `completed` restauré |
| Dialogues | `src/components/ui/__tests__/AppDialog.test.tsx` | hauteur bornée en pixels, pas en pourcentage |
| Health Connect | `src/lib/__tests__/healthConnect.test.ts` | `initialize()` avant lecture des permissions |
| Bilan énergétique | `src/lib/__tests__/energyBalance.test.ts` | conversion pas → kcal, hiérarchie des 4 sources |
| Capacité photo | `src/lib/__tests__/mealPhotoCapability.test.ts` | garde-fou quand la config serveur manque |
| Scan code-barres | `src/lib/__tests__/openFoodFacts.test.ts` | passerelle `/v1/products`, les 4 cas : trouvé, introuvable, serveur non configuré, injoignable |
| Notifications | `src/lib/__tests__/performanceNotifications.test.ts` | déterminisme (`now` injecté) |
| i18n | test de parité | les 4 langues (fr, en, es, de) restent complètes |
| Recherche d'aliments | `src/store/__tests__/foodStore.test.ts` | « aucun résultat » et « serveur injoignable » restent deux états distincts ; les aliments personnels survivent à la fusion |
| Profil (nom/prénom) | `src/store/__tests__/performanceStore.test.ts` | trim, bornage à 60 caractères, chaîne vide → `undefined` ; réhydratation réelle d'un état persisté antérieur |
| Sauvegarde de profil | `src/lib/__tests__/profileBackup.test.ts` | aller-retour export/import ; sauvegarde hostile (nombre, objet, 100 000 caractères) |
| Saisie du poids | `src/lib/__tests__/sanitizeWeightInput.test.ts` | un seul séparateur décimal, 6 caractères maximum |
| Tuiles de l'accueil | `src/constants/__tests__/homeTiles.test.ts` | ni `programs` ni `foods`, exactement 4 entrées |
| Destination du CTA profil | `src/constants/__tests__/routes.test.ts` | « Compléter mon profil » mène à l'écran qui contient réellement les champs |

---

## Ce qui n'est PAS couvert — et le sera par un humain

Ces vérifications n'existent que sur appareil ou à l'écran. Les tests unitaires
ne les remplacent pas.

| À vérifier | Pourquoi les tests ne suffisent pas |
|---|---|
| Démarrage de l'APK release | trois crashs sont passés avec tous les tests verts |
| Rendu visuel après changement de mise en page | CSS et markup valides séparément peuvent ne plus se connaître |
| **Textes des états vides, après tout remaniement de navigation** | la parité i18n vérifie qu'une clé existe, jamais que son texte est encore *vrai*. Un sous-titre a continué de renvoyer vers un onglet supprimé (voir known_bugs.md n°12) |
| **Destination des invitations à compléter un champ** | quand un champ change d'écran, les boutons qui invitent à le renseigner peuvent continuer de pointer vers l'ancien (voir known_bugs.md n°11) |
| Health Connect avec de vraies données | l'émulateur n'a aucune donnée de santé |
| Viewer 3D | les exercices avec modèle ne sont pas dans le catalogue de base |

---

## Validation avant publication — obligatoire

Un `eas submit` n'est légitime qu'après :

1. `npx tsc --noEmit` → 0 erreur
2. `npx jest --ci` → 0 échec
3. build release réussi
4. **APK installé et lancé sur l'émulateur** `SportTracker_Pixel8`
5. `adb logcat -b crash -d` → **vide**
6. AAB signé avec la clé EAS (`META-INF/E96922A6.RSA`)

L'étape 4 aurait évité un crash publié à tous les testeurs, pour quinze secondes
de test.

Tester aussi le **mode trois boutons**, configuration la plus répandue :

```bash
adb shell cmd overlay enable com.android.internal.systemui.navbar.threebutton
```

---

## Ne jamais affaiblir un test pour faire passer la validation

Interdit : supprimer une assertion gênante, ajouter un `skip`, élargir une
tolérance, retirer un cas. Si un test échoue, soit le code est faux, soit le test
l'est — dans les deux cas il faut comprendre avant de toucher.

Un exécutant qui rapporte « tout est vert » doit être **vérifié** : relancer les
tests soi-même et lire le diff.

---

## Tests ajoutés le 2026-08-16 (5 correctifs après la 1.8.0)

Chacun a été **vérifié par sabotage** : le défaut est réintroduit, le test doit
rougir, puis le code est restauré. Le message d'échec obtenu est indiqué.

| Fichier | Ce qu'il prouve | Message obtenu au sabotage |
|---|---|---|
| `src/components/exercises/__tests__/ExerciseDetailView.test.tsx` | l'animation est rendue pour un exercice absent de `exerciseGifs`, `exerciseMedia` et sans `remoteMediaBaseUrl` — le cas de ~850 exercices sur 873 | `Unable to find an element with testID: expo-image` |
| `src/app/(tabs)/progress/__tests__/index.test.tsx` | « Poids actuel » est absent de l'onglet Exercices et présent sur Poids corporel | `Found multiple elements with text: Poids actuel` et `expect(received).toBeNull()` |
| `src/app/(tabs)/__tests__/index.test.tsx` | l'accueil affiche « — » sans pesée, la valeur sinon | `Expected: "—" / Received: "0"` |
| `src/app/__tests__/onboarding.test.tsx` | le prénom saisi arrive dans `performanceStore` ; vide → `undefined`, pas chaîne vide | `Expected: "Marc" / Received: undefined` |
| `src/app/(tabs)/__tests__/profile.test.tsx` | chaque rangée du Profil ouvre la bonne destination | `Expected: "/(tabs)/nutrition/goals" / Received: "/(tabs)/settings"` |

Contre-exemple conservé : le premier test livré pour le média montait
`AnimatedExerciseImage` **seul**, alors que le garde-fou fautif était chez le
parent. Il restait vert avec la régression en place. Il est gardé — il documente
le composant — mais il ne protège de rien. **Toujours tester au niveau où vit le
défaut.**

### Vérification à l'écran (émulateur `SportTracker_Pixel8`)

Un changement visuel n'est pas validé par la suite de tests. Parcours effectué :
onboarding complet, accueil, Progression (3 onglets), Profil, création d'un
programme, séance active. `adb logcat -b crash -d` vide.

## Tests ajoutés le 2026-08-18 (audit UI/UX écran par écran, avant la 1.14.0)

Chaque test ci-dessous a été **vérifié par sabotage** : le défaut a été réintroduit,
le test a rougi, puis le correctif a été remis. Un test qui passe avant comme après
n'aurait rien prouvé.

| Test | Fichier | Ce qu'il attrape | Rouge constaté au sabotage |
|---|---|---|---|
| Fin de séance → historique, jamais session | `src/app/(tabs)/session/__tests__/active.test.tsx` | le `replace` parasite de l'effet de garde | `Number of calls: 2`, dont `/(tabs)/session` |
| Bouton d'abandon sur l'écran de chargement | `src/components/nutrition/__tests__/MealPhotoReview.test.tsx` | l'état `loading` redevenu cul-de-sac | `Unable to find an element with text: Annuler` |
| Pas de détail technique dans l'alerte | idem | le retour de la concaténation `${detail}` | message contenant `fetch failed` |
| « 1 exercice » au singulier | `src/app/(tabs)/session/__tests__/index.test.tsx` | le retour de la clé toujours-plurielle | `Unable to find an element with text: 1 exercice` |
| Minuteur de repos en anglais | `src/components/session/__tests__/RestTimerModal.test.tsx` | tout littéral français réintroduit | mot français rendu alors que `language: 'en'` |
| Libellés visibles des 4 icônes Nutrition | `src/app/(tabs)/nutrition/__tests__/index.test.tsx` | icônes redevenues muettes | `getByText` sur le libellé |

### Ce que ces tests ne peuvent PAS attraper

Deux défauts de cette série sont **invisibles en test unitaire** et n'ont été trouvés
qu'à l'écran, sur l'APK release installé sur `SportTracker_Pixel8` :

- le **chevauchement** du titre Historique avec la barre système (`edges` sans
  `'top'`) : RNTL ne calcule aucune mise en page, tout élément est « présent » ;
- l'**écran blanc** lui-même : il fallait voir le rendu pour constater qu'il n'y
  avait plus rien. Le test de régression écrit ensuite cible la *cause* (le double
  `replace`), pas le symptôme.

C'est le rappel du niveau 4 du portail : un écran se vérifie sur un appareil.

### Piège d'outillage rencontré

`npx jest "src/app/(tabs)/..."` ne trouve **aucun test** : jest interprète le motif
comme une expression régulière et les parenthèses de `(tabs)` cassent la
correspondance. Cibler par nom (`npx jest -t "nom du test"`) ou échapper le chemin.

De même, `npx tsc --noEmit | grep -v "npm notice"` renvoie le code de sortie du
`grep`, pas celui de `tsc` : un `$?` à 1 y signifie « grep n'a rien filtré », pas
« la compilation a échoué ». Rediriger vers un fichier et lire `$?` juste après.


## Tests ajoutes le 2026-08-19 (ajout rapide de calories, pas sur l'accueil)

| Test | Ce qu'il attrape | Rouge constate au sabotage |
|---|---|---|
| Ajout rapide ecrit bien au journal | l'appel a `addFoodEntry` supprime | `Expected length: 1 / Received length: 0` |
| Macros a 0 sur un ajout calorique | une repartition macro devinee | idem |
| Total du jour augmente du montant | le total non recalcule | idem |
| Pas + calories rendus sur l'accueil | le rendu des metriques retire | `Unable to find an element with text: 8000 pas` |
| Aucun « 0 » trompeur sans donnee | un fallback a zero | — |

**Piege rencontre pendant la verification** : le premier sabotage de l'ajout rapide a
ete applique sur `QuickCaloriesModal.tsx`, alors que l'appel a `addFoodEntry` se
trouve dans `nutrition/index.tsx`. Le `sed` n'a rien modifie, le test est reste vert,
et cela ressemblait a un test qui ne prouve rien. **Toujours verifier que le sabotage
a reellement change le fichier** (relire la ligne apres modification) avant de
conclure qu'un test est inutile.

**Non verifiable sur emulateur** : l'affichage reel des pas. L'image `google_apis`
n'embarque pas Health Connect. Seul l'etat « donnee indisponible » a pu etre constate
a l'ecran ; l'affichage des valeurs demande un appareil reel.

## Test ajoute le 2026-08-19 (catalogue d'exercices par defaut)

`src/store/__tests__/communityCatalogDefault.test.ts` importe
`community/bodyweight-fitness-beginner.json` TEL QUEL, sans installer aucun
pack au prealable, et verifie que les 12 exercices qu'il reference se
resolvent tous et que chaque jour importe contient au moins un exercice.

Sabotage : import remis sur `exercises.core.json` (22 exercices) -> le test
rougit avec les 12 noms exacts dans `unknownExercises`
(« Bodyweight Squat », « Dead Bug », ... ). Restaure -> vert.

**Piege de fixture identifie en ecrivant ce test** : les tests d'import
existants de `programStore.test.ts` installent deja le catalogue complet dans
un `beforeAll`, ce qui les faisait passer meme quand l'app reelle, au premier
lancement, ne le contenait pas. Un test isole, dans son propre fichier, sans
cette installation prealable, etait necessaire pour prouver le defaut.

## Test ajoute le 2026-08-21 (noms d'exercices)

`scripts/validate-exercise-names.test.js` lance le validateur sur le vrai catalogue et
echoue s'il reste une violation BLOQUANTE (R1 unicite / R2 materiel / R4 vide).

R3 (coherence de mouvement) est volontairement NON bloquante : trop de faux positifs
(« Floor Press » -> « Developpe couche au sol » est correct mais viole la regle). Elle
sert de rapport a relire, pas de barriere.

Sabotage verifie : en reintroduisant le doublon d'origine (offline-110 et offline-283
tous deux « Elevation laterale aux halteres ») le validateur sort en 1 et le test
rougit ; apres restauration il repasse au vert.

**Ce que ce test aurait attrape** : le defaut vivait dans les donnees depuis des mois,
invisible pour toute la suite existante — aucun test ne regardait la coherence entre
`name`, `nameFr` et `equipment`.

## Piege d'execution : `npx jest --ci` n'est PAS `npm test -- --ci`

Le 2026-08-22, deux suites (`MealPhotoReview`, `AppDialog`) ont echoue avec
`npx jest --ci`, chacune apres ~13 s, alors qu'elles passaient isolement. Avec
`npm test -- --ci` — la commande du depot, qui ajoute `--runInBand` — les
66 suites et 480 tests passent.

Cause : `npx jest` lance les suites EN PARALLELE. Le catalogue d'exercices fait
1,6 Mo et est importe par plusieurs suites ; la contention fait deborder les
delais.

**Toujours utiliser `npm test`**, pas `npx jest` directement. Un echec obtenu
avec la mauvaise commande fait perdre du temps a chercher une regression qui
n'existe pas.
## Retour arriere : `src/app/(tabs)/__tests__/backBehavior.test.tsx`

Deux niveaux, parce que la valeur seule ne prouve rien et le comportement seul
ne prouve pas qu'il est branche :

1. **Cablage** — `TabLayout` est rendu avec `<Tabs>` mocke ; le test verifie que
   la prop `backBehavior` vaut bien `history`.
2. **Comportement** — le VRAI `TabRouter` d'expo-router est instancie avec la
   vraie liste des 11 onglets ; cinq parcours reels sont rejoues puis un
   `GO_BACK` est applique. Chaque cas assert deux choses : `history` ramene au
   menu precedent, ET le defaut de la bibliotheque (`undefined`) ramenait bien a
   `index` — c'est l'oracle qui documente la cause.

Deux gardes completent : l'accueil reste la destination quand il EST le menu
precedent, et depuis l'accueil initial le retour laisse sortir de l'application
(pas de piege).

Sabotage verifie le 2026-08-27 : en retirant `backBehavior="history"` de
`src/app/(tabs)/_layout.tsx`, le test de cablage rougit
(`Expected: "history" / Received: undefined`) ; apres restauration, 8/8 au vert.

Verifie aussi sur l'emulateur (APK release 1.23.0, `SportTracker_Pixel8`) :
Profil -> Reglages -> retour = Profil (position de defilement conservee), puis
retour = Nutrition, puis retour = Accueil. `adb logcat -b crash -d` vide.
