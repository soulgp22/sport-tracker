# Import

## Import de programmes

L'import de programmes est géré par la fonction `importPrograms` dans `src/store/programStore.ts`.

### Flux d'import

1. **Parsing** : le fichier JSON est parsé et validé (vérification de la version, présence du tableau `programs`).
2. **Résolution des exercices** : pour chaque exercice, le système cherche une correspondance dans le catalogue (`src/data/exercises.catalog.json`) via `exerciseId` puis `exerciseName`.
3. **Collecte des inconnus** : les exercices non trouvés sont listés dans `unknownExercises` et ignorés.
4. **Import** : les exercices connus sont ajoutés au programme avec leur nom catalogue.

### Mode preview (`commit: false`)

La fonction `importPrograms` accepte un paramètre `commit` :

```typescript
importPrograms(text: string, commit?: boolean): ImportResult
```

- **`commit: false`** (défaut) : le résultat est calculé mais **aucune modification n'est appliquée** au store. Cela permet de prévisualiser ce qui serait importé.
- **`commit: true`** : les programmes sont effectivement ajoutés au store.

### Résultat d'import (`ImportResult`)

```typescript
interface ImportResult {
  importedPrograms: number;   // nombre de programmes importés
  importedExercises: number;  // nombre d'exercices importés avec succès
  unknownExercises: string[]; // noms d'exercices non trouvés dans le catalogue
  skipped: number;            // nombre d'exercices ignorés
  errors: string[];           // erreurs (JSON invalide, version non supportée, etc.)
}
```

Exemple de résultat pour un programme contenant un exercice inconnu :
```json
{
  "importedPrograms": 1,
  "importedExercises": 14,
  "unknownExercises": ["Superman Push-Up"],
  "skipped": 1,
  "errors": []
}
```

### Validation du fichier d'import

Avant même de traiter le contenu, le fichier est validé :
- **Taille maximale** : 5 Mo (`MAX_IMPORT_FILE_BYTES` dans `src/lib/importLimits.ts`)
- **JSON valide** : erreur `"Le fichier n'est pas un JSON valide."`
- **Version** : seule la version `1` est supportée ; une version supérieure déclenche `"Version X non supportée."`

## Import d'aliments

L'import d'aliments se fait via deux canaux dans `src/store/foodStore.ts` :

### Import JSON (`importFoods`)

Le fichier JSON est validé par `validateFoodsJson` (`src/lib/foodValidation.ts`). La structure acceptée est :
- Un tableau direct d'aliments : `[ { "id": "...", ... }, ... ]`
- Ou un objet avec un tableau `foods` : `{ "version": 1, "foods": [...] }`

Chaque aliment est validé avec les contraintes suivantes :
- Champs obligatoires : `id`, `name`, `category`, `unit`, `nutritionPer100g`
- `nutritionPer100g` doit contenir `calories`, `protein`, `carbs`, `fat` (nombres positifs ou nuls)
- `unit` doit être parmi : `"g"`, `"ml"`, `"portion"`, `"unité"`
- `id` doit être unique dans le fichier et parmi les aliments existants

### Import CSV (`importFoodsFromCsv`)

Le fichier CSV est d'abord parsé par `parseFoodsCsv` (`src/lib/foodCsv.ts`), puis validé par `validateFoodsJson`.

Le parseur CSV supporte :
- Séparateur `,` ou `;` (détection automatique sur la ligne d'en-tête)
- Nombres avec virgule ou point (`12,5` → `12.5`)
- Alias d'en-têtes : `nom`, `aliment` → `name` ; `kcal`, `energie` → `calories` ; `proteines` → `protein` ; etc.
- Colonnes obligatoires : `name`, `category`, `calories`, `protein`, `carbs`, `fat`
- Colonnes optionnelles : `fiber`, `sugar`, `salt`, `unit`, `id`
- Unité par défaut : `"g"`
- Génération automatique d'`id` : slug basé sur le nom (ex. `"Flocons d'avoine"` → `"flocons_d_avoine"`)

- **Programmes** : le tableau `programs` doit exister et être non vide

### Gestion des doublons

La validation détecte deux types de doublons :
1. **Doublons dans le fichier** : un même `id` apparaît plusieurs fois dans le fichier importé.
2. **Doublons avec les données existantes** : un `id` est déjà utilisé par un aliment du store.

Les `id` en double sont listés dans `duplicateIds`. Les aliments concernés ne sont pas importés.

```typescript
interface ImportFoodsResult {
  added: number;         // aliments effectivement ajoutés
  errors: string[];      // erreurs de validation
  duplicateIds: string[]; // identifiants en double
}
```

## Téléchargement des contenus communautaires

Le store `useCommunityStore` (`src/store/communityStore.ts`) gère le téléchargement des contenus distants.

### Manifeste

Le manifeste est récupéré depuis :
```
https://raw.githubusercontent.com/soulgp22/sport-tracker/main/community/index.json
```

Il est mis en cache dans `AsyncStorage` (clé `sport-tracker:community-manifest:v1`). Si le réseau est indisponible, la version en cache est utilisée avec le message `"Hors-ligne, liste en cache."`.

### Limite de 5 Mo

Tous les téléchargements communautaires sont soumis à une limite de **5 Mo** (`MAX_IMPORT_FILE_BYTES`), vérifiée via l'en-tête HTTP `content-length` et la taille du texte après réception.

### Téléchargement de programme

```typescript
downloadProgram(entry: CommunityProgramEntry): Promise<ImportResult>
```
Télécharge le fichier JSON et appelle `importPrograms` avec `commit: true`.

### Téléchargement de base d'aliments

```typescript
downloadFoodDatabase(entry: CommunityFoodDatabaseEntry): Promise<ImportFoodsResult>
```
Télécharge le fichier et appelle `importFoods` (JSON) ou `importFoodsFromCsv` (CSV) selon le `format` indiqué dans le manifeste.

### Téléchargement de pack d'exercices

```typescript
downloadExercisePack(entry: CommunityExercisePackEntry): Promise<number>
```
Télécharge et installe un pack d'exercices additionnels (exercices avec médias hébergés sur GitHub).

