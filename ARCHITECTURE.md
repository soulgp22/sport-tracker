# ARCHITECTURE — Sport Tracker

## Stack

| Couche | Choix | Raison |
|---|---|---|
| Framework | Expo SDK 56 + React Native 0.85 | Compatible Expo Go, OTA updates |
| Langage | TypeScript strict | Typage bout-en-bout |
| Routage | expo-router v56 (file-based) | 5 onglets natifs, deep links gratuits |
| Etat global | Zustand + middleware `persist` | Leger, TS-first, pas de boilerplate |
| Persistance | @react-native-async-storage/async-storage | Hors-ligne, aucun backend |
| Graphiques | react-native-gifted-charts + react-native-svg | Expo Go compatible, API declarative |
| Timer | `useReducer` + `setInterval` (hook local) | Pas de dependance externe |

---

## Arborescence

> Le template Expo SDK 56 place le code dans `src/`. expo-router detecte `src/app/` automatiquement.

```
sport-tracker/
├── src/
│   ├── app/                              # expo-router root (src/app/)
│   │   ├── _layout.tsx                   # Root layout (SafeAreaProvider, store hydration)
│   │   └── (tabs)/
│   │       ├── _layout.tsx               # Tab bar (4 onglets + icones)
│   │       ├── programs/
│   │       │   ├── index.tsx             # Liste des programmes
│   │       │   ├── new.tsx               # Creer un programme
│   │       │   └── [id]/
│   │       │       ├── index.tsx         # Detail / edition programme
│   │       │       └── day/[dayId].tsx   # Edition d'un jour
│   │       ├── session/
│   │       │   ├── index.tsx             # Selection programme -> demarrer seance
│   │       │   └── active.tsx            # Seance live (series + timer repos)
│   │       ├── exercises/
│   │       │   ├── index.tsx             # Catalogue offline recherche + filtres
│   │       │   └── [id].tsx              # Detail exercice + GIF + instructions
│   │       ├── history/
│   │       │   ├── index.tsx             # Liste des seances passees
│   │       │   └── [id].tsx              # Detail seance
│   │       └── progress/
│   │           └── index.tsx             # Graphiques progression
│   ├── types/
│   │   └── index.ts                      # Tous les types TS (voir ci-dessous)
│   ├── store/
│   │   ├── programStore.ts               # CRUD programmes (Zustand + persist)
│   │   ├── exerciseCatalogStore.ts       # Catalogue offline read-only
│   │   ├── sessionStore.ts               # Historique seances (Zustand + persist)
│   │   └── activeSessionStore.ts         # Seance en cours (Zustand, non persiste)
│   ├── data/
│   │   ├── exercises.catalog.json        # Catalogue embarque
│   │   └── exercises.gifs.ts             # Map statique require() pour Metro/RN
│   ├── storage/
│   │   └── storageAdapter.ts             # Wrapper AsyncStorage pour Zustand persist
│   ├── hooks/
│   │   ├── useRestTimer.ts               # Timer de repos (countdown)
│   │   └── useProgressData.ts            # Calcul series / volume par exercice
│   └── components/
│       ├── programs/
│       │   ├── ProgramCard.tsx
│       │   ├── ExerciseRow.tsx
│       │   └── SetEditor.tsx
│       ├── session/
│       │   ├── ActiveExerciseCard.tsx
│       │   ├── SetLogger.tsx
│       │   └── RestTimerModal.tsx
│       ├── history/
│       │   └── SessionCard.tsx
│       ├── progress/
│       │   ├── WeightChart.tsx
│       │   └── VolumeChart.tsx
│       └── ui/
│           ├── Button.tsx
│           ├── TextInput.tsx
│           └── EmptyState.tsx
├── assets/
├── app.json
├── tsconfig.json
└── package.json
```

---

## Types TypeScript (modele de donnees)

```typescript
// src/types/index.ts

// --- Ancienne bibliotheque compatibilite ---
export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
}

// --- Catalogue d'exercices offline (reference partagee) ---
export interface CatalogExercise {
  id: string;
  name: string;
  nameFr?: string;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  instructions: string[];
  gif: string;
}

// --- Programme ---
export interface ProgramSet {
  reps: number;
  weight: number;       // poids cible en kg
  restSeconds: number;
}

export interface ProgramExercise {
  id: string;
  exerciseId: string;
  exerciseName: string; // compatibilite, derive du catalogue
  sets: ProgramSet[];
  order: number;
}

export interface ProgramDay {
  id: string;
  name: string;
  exercises: ProgramExercise[];
  order: number;
}

export interface Program {
  id: string;
  name: string;
  days: ProgramDay[];
  createdAt: string;    // ISO 8601
  updatedAt: string;
}

// --- Seance live ---
export interface LoggedSet {
  targetReps: number;
  targetWeight: number;
  actualReps: number;
  actualWeight: number;
  completed: boolean;
  completedAt?: string; // ISO 8601
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
}

export interface Session {
  id: string;
  programId?: string;
  programDayId?: string;
  programName?: string;
  dayName?: string;
  date: string;               // ISO 8601 (debut seance)
  durationSeconds: number;
  exercises: SessionExercise[];
  notes?: string;
}

// --- Seance active (etat temporaire) ---
export interface ActiveSession {
  programId: string;
  programDayId: string;
  startedAt: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  exercises: SessionExercise[];
  restTimerActive: boolean;
  restSecondsRemaining: number;
}
```

---

## Gestion d'etat (Zustand)

### `programStore`
```
state  : { programs: Program[];  exercises: Exercise[] }
actions: addProgram · updateProgram · deleteProgram
         addExercise · updateExercise
persist: AsyncStorage, cle "programs-store"
```

`importPrograms(json, { commit?: boolean })` parse les exports version 1, valide les exercices par `exerciseId` puis par nom normalise dans le catalogue, importe les exercices connus et ignore les inconnus. Le resultat est structure : `importedPrograms`, `importedExercises`, `unknownExercises`, `skipped`, `errors`.

### `exerciseCatalogStore`
```
state  : { exercises: CatalogExercise[]; bodyParts: string[]; equipments: string[] }
actions: all · getById · findByName · search · filterByMuscle
persist: NON (donnees statiques embarquees)
```

### `sessionStore`
```
state  : { sessions: Session[] }
actions: addSession · deleteSession
computed: getSessionsByExercise(exerciseId) -> pour les graphiques
persist: AsyncStorage, cle "sessions-store"
```

### `activeSessionStore`
```
state  : { active: ActiveSession | null }
actions: startSession · logSet · nextSet · finishSession
persist: NON (perte acceptable si l'app est tuee)
```

---

## Design Storage

| Cle AsyncStorage | Contenu | Taille estimee |
|---|---|---|
| `programs-store` | JSON de tous les programmes | < 100 Ko |
| `sessions-store` | JSON de toutes les seances | < 500 Ko (6 mois) |

- Zustand `persist` middleware serialise / deserialise automatiquement.
- Pas de migration de schema en MVP.

---

## Choix bibliotheque de graphiques

**`react-native-gifted-charts`** (+ `react-native-svg` comme peer dep)

- Pas de dependance Skia / Reanimated lourde.
- Compatible Expo Go sans configuration native.
- API declarative, supporte LineChart et BarChart.
- Alternatives ecartees : Victory Native v37+ (Skia obligatoire), Recharts (web seulement).

---

## Catalogue offline

- Source principale du script : ExerciseDB v1 free tier (`https://oss.exercisedb.dev/api/v1/exercises`) avec GIFs 180p.
- Generation : `node scripts/build-exercise-catalog.mjs`.
- Sorties : `assets/exercises/gifs/*.gif`, `src/data/exercises.catalog.json`, `src/data/exercises.gifs.ts`.
- Budget media vise : environ 80 Mo maximum ; le script reduit le nombre d'exercices si necessaire.
- Fallback : `CATALOG_FALLBACK=1 node scripts/build-exercise-catalog.mjs` genere un catalogue offline local et des GIFs placeholder lorsque l'API est indisponible.

## Navigation (expo-router tabs)

| Onglet | Route | Icone |
|---|---|---|
| Programmes | `/(tabs)/programs` | dumbbell |
| Seance | `/(tabs)/session` | play-circle |
| Exercices | `/(tabs)/exercises` | body |
| Progression | `/(tabs)/progress` | trending-up |
| Parametres | `/(tabs)/settings` | settings |

Historique reste routable via `/(tabs)/history` et `/(tabs)/history/[id]`, mais n'est plus dans la TabBar (`href: null`). L'acces principal est le lien "Voir l'historique" dans Progression.
