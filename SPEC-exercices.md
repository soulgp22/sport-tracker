# SPEC — Bibliothèque d'exercices (onglet + catalogue offline + import)

> Pour Codex (gpt-5.5, reasoning high). Implémente cette feature de A à Z dans ce
> projet Expo SD K 56 / RN 0.85 / TypeScript / expo-router / zustand / AsyncStorage.
> Lis d'abord `ARCHITECTURE.md` et respecte les conventions existantes (stores zustand
> dans `src/store`, types dans `src/types`, écrans dans `src/app/(tabs)`, composants UI
> dans `src/components/ui`). Lance les tests (`npm test`) et le typecheck (`npx tsc --noEmit`)
> à la fin : ils doivent rester verts.

## Objectif
Ajouter un **catalogue d'exercices de musculation embarqué (offline)** avec **GIF du
mouvement**, et faire que **les programmes se composent uniquement d'exercices du
catalogue**. Corriger le système d'import.

## 1. Données : catalogue offline curé (~300 exercices + GIFs)
Source : **ExerciseDB open dataset** (https://github.com/exercisedb/exercisedb-api,
GIFs sur leur CDN). Usage **personnel/offline** (app sideloadée, non publiée) — ne pas
republier les assets ; ajouter une note de provenance dans le README.

- Écris un script `scripts/build-exercise-catalog.mjs` qui :
  1. Récupère la liste complète des exercices depuis l'API/dataset ExerciseDB.
  2. **Cure un sous-ensemble d'environ 300** exercices : priorise les mouvements
     courants (barbell, dumbbell, machine, bodyweight, cable) couvrant tous les groupes
     musculaires majeurs (chest, back, shoulders, biceps, triceps, quads, hamstrings,
     glutes, calves, abs). Équilibre par groupe musculaire.
  3. Télécharge le GIF de chaque exercice retenu dans `assets/exercises/gifs/<id>.gif`.
  4. Génère `src/data/exercises.catalog.json` : tableau d'objets
     `{ id, name, nameFr?, bodyPart, target (muscle principal), secondaryMuscles[],
       equipment, instructions[] , gif: "<id>.gif" }`.
  5. Optimise le poids : si le bundle GIF dépasse ~80 Mo, réduis le nombre d'exos
     (vers ~200) plutôt que de dégrader. Logue la taille totale finale.
- Mappe les GIFs en require statique : génère aussi `src/data/exercises.gifs.ts` qui
  exporte un `Record<string, ReturnType<typeof require>>` (`require('@/assets/exercises/gifs/xxx.gif')`)
  car React Native ne charge pas les assets par chemin dynamique.
- Si ExerciseDB est indisponible/limité, fallback documenté : utiliser
  https://github.com/yuhonas/free-exercise-db (images statiques) et noter la dégradation.

## 2. Types & store
- `src/types` : ajoute `CatalogExercise` (forme ci-dessus).
- Nouveau store `src/store/exerciseCatalogStore.ts` (zustand) : charge le catalogue JSON
  (statique, pas AsyncStorage — c'est de la data read-only embarquée), expose
  `getById(id)`, `search(query)`, `filterByMuscle(bodyPart)`, `all()`, et la liste des
  bodyParts/équipements pour les filtres.
- **Lien programmes ↔ catalogue** : `ProgramExercise.exerciseId` DOIT référencer un
  `CatalogExercise.id`. `exerciseName` devient dérivé du catalogue (garde le champ pour
  compat mais remplis-le depuis le catalogue à la sélection).

## 3. Onglet « Exercices » (remplace la position d'Historique dans la barre)
- Crée `src/app/(tabs)/exercises/_layout.tsx` (Stack) + `index.tsx` (liste) +
  `[id].tsx` (détail).
- Barre d'onglets (`src/app/(tabs)/_layout.tsx`) : **5 onglets** =
  Programmes / Séance / **Exercices** / Progression / Paramètres. Icône Ionicons
  `body-outline` (ou `barbell`) pour Exercices.
- **Historique déplacé hors de la barre** : retire l'onglet `history` de la TabBar
  (mets `href: null` sur sa `Tabs.Screen` OU déplace le dossier), et ajoute un accès à
  l'Historique depuis l'onglet **Progression** (bouton/lien en haut « Voir l'historique »
  qui pousse vers l'écran historique). Les routes `history/index` et `history/[id]`
  doivent rester fonctionnelles (ne casse pas la navigation existante).
- **Écran liste Exercices** : barre de recherche + filtres par groupe musculaire
  (chips), grille/liste avec vignette GIF (statique au repos OK) + nom + muscle ciblé.
- **Écran détail** : GIF en grand (animé), nom, muscle principal + secondaires,
  matériel, instructions étape par étape.

## 4. Composition des programmes via le catalogue
- Dans l'éditeur de jour (`src/app/(tabs)/programs/[id]/day/[dayId].tsx`), remplace le
  champ texte libre « Nom de l'exercice » par un **sélecteur d'exercice** : un bouton
  qui ouvre un modal/écran de **choix depuis le catalogue** (réutilise la liste+recherche).
  À la sélection, l'exercice du jour pointe vers `exerciseId` du catalogue et affiche son
  nom + une mini vignette GIF. Conserve sets/reps/poids/repos comme aujourd'hui.
- La séance live et l'historique affichent le nom (et éventuellement la vignette) depuis
  le catalogue.

## 5. Corriger l'import (`importPrograms` dans `src/store/programStore.ts`)
> Le système d'import actuel ne fonctionne pas — corrige-le ET ajoute la validation catalogue.
- Parse le JSON importé (un ou plusieurs programmes au format export de l'app).
- **Valide chaque exercice contre le catalogue** (par `exerciseId`, ou par nom normalisé
  en fallback) :
  - Exercices **connus** → importés normalement.
  - Exercices **inconnus** (absents du catalogue) → NON importés.
- Retourne un `ImportResult` structuré : `{ importedPrograms, importedExercises,
  unknownExercises: string[], skipped }`.
- L'UI (écran Paramètres, bouton Importer) : si des exercices sont inconnus, affiche une
  alerte du type « Le fichier contient N exercices inconnus (liste). Importer seulement
  les exercices reconnus et ignorer le reste ? » avec **Confirmer / Annuler**. À la
  confirmation, importe le connu, ignore l'inconnu. Sans inconnu : import direct.
- Ajoute/rends fonctionnel le bouton Importer (expo-document-picker est déjà en deps) et
  un bouton Exporter (partage du JSON) s'il n'existe pas déjà.

## 6. Tests
- Tests unitaires pour : `exerciseCatalogStore` (search/filter/getById), et surtout la
  **logique d'import** (connu vs inconnu, ImportResult correct, ignore l'inconnu).
- Garde les 73 tests existants verts.

## Définition de terminé
- `npx tsc --noEmit` = 0 erreur ; `npm test` = tout vert.
- `npx expo export --platform android` bundle sans erreur.
- 5 onglets dont « Exercices » fonctionnel avec GIFs offline ; programmes composés depuis
  le catalogue ; import qui gère connu/inconnu ; historique toujours accessible (via
  Progression).
- Mets à jour `ARCHITECTURE.md` et `README.md` (provenance des données, script de build
  du catalogue).
