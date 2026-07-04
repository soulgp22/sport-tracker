# Sport Tracker

Application Expo / React Native de suivi de programmes, séances, historique et progression.

## Développement

```bash
npm install
npx expo start
```

Vérifications principales :

```bash
npx tsc --noEmit
npm test
npx expo export --platform android
```

## Catalogue d'exercices offline

L'app embarque un catalogue read-only dans `src/data/exercises.catalog.json` et des GIFs statiques référencés par `src/data/exercises.gifs.ts`. Les programmes doivent référencer un `exerciseId` du catalogue ; le nom affiché est dérivé du catalogue avec un fallback vers le champ compatibilité `exerciseName`.

Le script de génération est :

```bash
node scripts/build-exercise-catalog.mjs
```

Source prévue : ExerciseDB v1 free tier (`https://oss.exercisedb.dev/api/v1/exercises`) avec GIFs 180p servis par leur CDN. Ces données et médias sont destinés à un usage personnel/offline dans cette app sideloadée ; ne pas republier les assets générés séparément.

Si l'API ExerciseDB renvoie des limites réseau pendant le build, le script supporte un fallback local :

```bash
CATALOG_FALLBACK=1 node scripts/build-exercise-catalog.mjs
```

Ce fallback garde l'app buildable hors réseau avec un catalogue offline et des GIFs placeholder. Relancer le script sans fallback remplacera les données par le catalogue ExerciseDB quand l'API est disponible.

## Import / export

Les paramètres permettent d'importer/exporter un JSON versionné :

```json
{
  "version": 1,
  "programs": []
}
```

Pendant l'import, chaque exercice est validé par `exerciseId`, puis par nom normalisé. Les exercices inconnus sont ignorés après confirmation utilisateur ; les exercices connus sont importés avec leur nom catalogue.

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
