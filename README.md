# Life Sport Tracker

Application Expo / React Native de suivi de programmes, séances, historique et progression.

## Prérequis

- Node.js (compatible avec Expo SDK 56)
- npm

## Installation

```bash
npm install
```

## Lancement

```bash
npx expo start
```

Pour lancer directement sur Android (émulateur ou appareil connecté) :

```bash
npx expo start --android
```

## Tests

```bash
npm test
```

Typecheck :

```bash
npx tsc --noEmit
```

Validation des contenus communautaires :

```bash
npm run validate:community
```

Build Android :

```bash
npx expo export --platform android
```

## Structure du dépôt

```
community/           Contenus communautaires (programmes, bases d'aliments, index)
docs/                Documentation
scripts/             Scripts de maintenance (validation, fetch Open Food Facts)
src/
  data/              Données embarquées (catalogue d'exercices, aliments par défaut)
  lib/               Logique métier (validation, parsers, limites)
  store/             Stores Zustand (programs, foods, community, exerciseCatalog)
  types/              Types TypeScript
```

## Documentation

La documentation détaillée est dans le dossier `docs/` :

| Fichier | Contenu |
|---------|---------|
| [`docs/programmes.md`](docs/programmes.md) | Structure d'un pack de programme, champs, convention reps=secondes, ajout d'un programme, manifeste, repères de programmation (RIR, double progression, repos, deload). |
| [`docs/exercices.md`](docs/exercices.md) | Le catalogue `exercises.catalog.json` (873 entrées, nameFr, gif a/b), contrainte du nom exact, comportement à l'import, ajout/modification et limite des médias. |
| [`docs/import.md`](docs/import.md) | Import de programmes (preview, ImportResult, unknownExercises), import d'aliments (JSON, CSV, doublons), téléchargement communautaire (manifeste, cache offline, limite 5 Mo). |
| [`docs/aliments.md`](docs/aliments.md) | Modèle Food, 12 catégories, unités, organisation par pays, enseignes, source Open Food Facts (ODbL), filtres qualité, limites. |
| [`docs/maintenance.md`](docs/maintenance.md) | Scripts npm, tests, typecheck, toutes les validations et messages d'erreur, éviter les doublons, mise à jour, rollback, gestion des erreurs API. |

