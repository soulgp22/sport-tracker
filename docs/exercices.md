# Exercices

## Le catalogue `src/data/exercises.catalog.json`

L'application embarque un catalogue d'exercices en lecture seule. Il contient **873 entrées** et sert de référence unique pour tous les exercices utilisés dans les programmes et les séances.

### Structure d'une entrée du catalogue

Chaque entrée possède les champs suivants :

| Champ | Description |
|-------|-------------|
| `id` | Identifiant unique (ex. `"offline-001"`). |
| `name` | Nom canonique en anglais (ex. `"3/4 Sit-Up"`). |
| `nameFr` | Traduction française (ex. `"Relevé de buste 3/4"`). |
| `bodyPart` | Groupe musculaire principal (ex. `"abdominals"`). |
| `target` | Muscle cible (ex. `"abdominals"`). |
| `secondaryMuscles` | Muscles secondaires sollicités (tableau de chaînes). |
| `equipment` | Matériel nécessaire (ex. `"body only"`). |
| `instructions` | Consignes d'exécution en anglais (tableau d'étapes). |
| `instructionsFr` | Consignes d'exécution en français (tableau d'étapes). |
| `gif` | Références aux médias : `{ a: string, b: string }`, généralement des images `.jpg`. |

Extrait réel du catalogue :
```json
{
  "id": "offline-001",
  "name": "3/4 Sit-Up",
  "bodyPart": "abdominals",
  "target": "abdominals",
  "secondaryMuscles": [],
  "equipment": "body only",
  "instructions": [
    "Lie down on the floor and secure your feet...",
    "Place your hands behind or to the side of your head..."
  ],
  "gif": {
    "a": "offline-001-a.jpg",
    "b": "offline-001-b.jpg"
  },
  "nameFr": "Relevé de buste 3/4",
  "instructionsFr": [
    "Allongez-vous sur le sol et fixez vos pieds...",
    "Placez vos mains derrière ou à côté de votre tête..."
  ]
}
```

## Pourquoi `exerciseName` doit correspondre EXACTEMENT au champ `name` du catalogue

Lors de la validation (`npm run validate:community`) et de l'import, le nom d'exercice (`exerciseName`) est comparé au catalogue via une comparaison **exacte et normalisée** :

1. Le texte est normalisé : minuscules, suppression des accents, remplacement des caractères non alphanumériques par un espace, réduction des espaces multiples.
2. La correspondance est recherchée dans un index construit à partir du champ `name` (et `nameFr`) de chaque entrée du catalogue.

**Exemple concret** : `"Barbell Full Squat"` dans un programme correspond à l'entrée du catalogue dont le `name` est exactement `"Barbell Full Squat"`. Une faute de frappe comme `"Barbell Full Squats"` (avec un 's' final) serait rejetée.

La correspondance se fait également sur le nom français (`nameFr`), ce qui permet d'utiliser le nom français dans les fichiers de programme si souhaité.

## Ce qui se passe à l'import si le nom est inconnu

Quand un programme est importé (que ce soit via un fichier local ou un téléchargement communautaire), chaque exercice est résolu ainsi (cf. `src/store/programStore.ts`, fonction `importPrograms`) :

1. L'import tente d'abord de résoudre par `exerciseId`, puis par `exerciseName`.
2. Si aucun exercice du catalogue ne correspond (`!catalogExercise`), le nom est ajouté à la liste `unknownExercises` dans le `ImportResult`.
3. L'exercice inconnu est **ignoré** (il n'est pas ajouté au programme importé).
4. Le compteur `skipped` est incrémenté.

```typescript
// Extrait de src/store/programStore.ts
const catalogExercise =
  (ex.exerciseId ? getCatalogExercise(ex.exerciseId) : undefined) ??
  (ex.exerciseName ? findCatalogExerciseByName(ex.exerciseName) : undefined);

if (!catalogExercise) {
  unknownExercises.add(ex.exerciseName ?? ex.exerciseId ?? `Exercice inconnu #${exercises.length + 1}`);
  skipped += 1;
  continue;
}
```

Le résultat `ImportResult` retourné contient :
```typescript
{
  importedPrograms: number;   // nombre de programmes importés
  importedExercises: number;  // nombre d'exercices importés avec succès
  unknownExercises: string[]; // noms d'exercices non trouvés dans le catalogue
  skipped: number;            // nombre d'exercices ignorés
  errors: string[];           // erreurs de validation
}
```

L'interface utilisateur affiche la liste `unknownExercises` pour confirmation avant l'import définitif.

## Comment ajouter ou modifier un exercice

### Ajouter un nouvel exercice au catalogue

Le catalogue est généré par le script `node scripts/build-exercise-catalog.mjs` à partir de l'API ExerciseDB. **On ne modifie pas le catalogue manuellement.**

Les données proviennent de l'API publique ExerciseDB v1 free tier (`https://oss.exercisedb.dev/api/v1/exercises`) avec des GIFs 180p servis par leur CDN.

Si l'API est indisponible, un fallback est disponible :
```bash
CATALOG_FALLBACK=1 node scripts/build-exercise-catalog.mjs
```

### Contrainte des médias (gif a/b)

Chaque entrée du catalogue référence obligatoirement deux images via `gif.a` et `gif.b`. Ces médias sont :
- Soit des `.jpg` statiques dans le catalogue offline (fallback)
- Soit des `.gif` animés servis par le CDN ExerciseDB (quand l'API est disponible)

**On ne peut pas inventer d'entrées** avec des noms d'exercices arbitraires car les médias correspondants n'existeraient pas dans le CDN. Tout ajout passe par le script de build qui synchronise le catalogue avec la source ExerciseDB.

> Ces données et médias sont destinés à un usage personnel/offline dans cette app sideloadée ; ne pas republier les assets générés séparément.
