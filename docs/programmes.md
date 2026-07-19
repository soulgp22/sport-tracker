# Programmes

## Structure d'un pack de programme

Un pack de programme est un fichier JSON versionné. Il suit la convention de version 1 et contient un tableau `programs` regroupant un ou plusieurs programmes.

Exemple réel tiré de `community/full-body-3.json` :

```json
{
  "version": 1,
  "programs": [
    {
      "name": "Full Body Débutant",
      "days": [
        {
          "name": "Séance A",
          "exercises": [
            {
              "exerciseName": "Barbell Full Squat",
              "alternativeExerciseNames": ["Leg Press"],
              "sets": [
                { "reps": 8, "weight": 0, "restSeconds": 120 },
                { "reps": 8, "weight": 0, "restSeconds": 120 },
                { "reps": 8, "weight": 0, "restSeconds": 120 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Rôle de chaque champ

| Champ | Type | Description |
|-------|------|-------------|
| `version` | `number` | Toujours `1`. Conditionne la validation du fichier. |
| `programs` | `array` | Liste des programmes contenus dans le pack. |
| `programs[].name` | `string` | Nom affiché du programme. |
| `programs[].days` | `array` | Liste des séances (jours). |
| `days[].name` | `string` | Nom de la séance (ex. `"Séance A"`). |
| `days[].exercises` | `array` | Liste des exercices de la séance. |
| `exercises[].exerciseName` | `string` | **Nom exact** de l'exercice dans le catalogue (`src/data/exercises.catalog.json`). |
| `exercises[].alternativeExerciseNames` | `string[]` (optionnel) | Noms alternatifs d'exercices (du catalogue) pouvant remplacer l'exercice principal. |
| `exercises[].sets` | `array` | Liste des séries. |
| `sets[].reps` | `integer` | Nombre de répétitions (ou **secondes** pour les exercices isométriques, voir ci-dessous). |
| `sets[].weight` | `integer` | Toujours `0` dans les packs communautaires. La charge est renseignée par l'utilisateur. |
| `sets[].restSeconds` | `integer` | Temps de repos entre séries, en secondes. |

> **Important** : `weight` doit toujours être `0` dans un pack de programme. Le validateur (`npm run validate:community`) rejette toute valeur différente de zéro.

## Convention reps = secondes pour les isométriques

Pour les exercices **isométriques ou au temps** (gainage, sprint, corde à sauter, etc.), le champ `reps` représente un nombre de **secondes** et non des répétitions.

Exemple tiré du programme sans matériel intégral (`community/sans-materiel-integral.json`) :

```json
{
  "exerciseName": "Plank",
  "sets": [
    { "reps": 45, "weight": 0, "restSeconds": 45 }
  ]
}
```

Ici, `reps: 45` signifie **45 secondes** de gainage. Exercices concernés : `Plank`, `Side Bridge`, corde à sauter, sprints, etc.

## Comment ajouter un nouveau programme (pas à pas)

1. **Créer le fichier JSON** dans `community/`, par exemple `community/mon-programme.json`.

2. **Structurer le contenu** selon le modèle ci-dessus en version 1. Chaque `exerciseName` et chaque nom dans `alternativeExerciseNames` doit correspondre **exactement** au champ `name` d'une entrée de `src/data/exercises.catalog.json`. La casse, la ponctuation et les espaces doivent être identiques.

3. **Inscrire le programme dans le manifeste** `community/index.json`, dans la section `programs` (voir ci-dessous).

4. **Lancer la validation** :
   ```bash
   npm run validate:community
   ```

   Le script vérifie :
   - la validité de tous les fichiers JSON
   - que chaque `exerciseName` et `alternativeExerciseName` existe dans le catalogue
   - que les compteurs `daysCount` et `exercisesCount` du manifeste correspondent au contenu réel
   - que `weight` vaut `0` dans toutes les séries
   - que tous les `reps` et `restSeconds` sont des entiers positifs
   - qu'il n'y a pas de doublons de noms de programme

## Inscription dans `community/index.json`

Chaque programme doit avoir une entrée dans le tableau `programs` du manifeste. Tous les champs :

| Champ | Obligatoire | Description |
|-------|:-----------:|-------------|
| `id` | Oui | Identifiant unique (ex. `"full-body-3"`). |
| `name` | Oui | Nom affiché (doit correspondre au `name` dans le fichier). |
| `description` | Oui | Une phrase décrivant le programme. |
| `author` | Oui | Auteur du programme. |
| `level` | Oui | Niveau : `"Débutant"`, `"Intermédiaire"` ou `"Avancé"`. |
| `daysCount` | Oui | Nombre exact de jours/séances dans le fichier. |
| `exercisesCount` | Oui | Nombre total d'exercices dans le fichier. |
| `file` | Oui | Nom du fichier JSON (ex. `"full-body-3.json"`). |
| `goal` | Non | Objectif (ex. `"Initiation full body"`). |
| `equipment` | Non | Matériel nécessaire (ex. `"Barre, haltères, poulie et machines"`). |
| `sessionsPerWeek` | Non | Nombre de séances par semaine recommandé. |
| `sessionMinutes` | Non | Durée estimée d'une séance, en minutes. |
| `progression` | Non | Description de la méthode de progression. |
| `tags` | Non | Mots-clés pour le filtrage (ex. `["débutant", "full body", "3 jours"]`). |

Exemple d'une entrée complète (tirée de `community/index.json`) :

```json
{
  "id": "full-body-3",
  "name": "Full Body Débutant",
  "description": "Programme corps entier 3 séances/semaine, idéal pour démarrer la musculation sur les mouvements de base.",
  "author": "Life Sport Tracker",
  "level": "Débutant",
  "daysCount": 3,
  "exercisesCount": 15,
  "file": "full-body-3.json",
  "goal": "Initiation full body",
  "equipment": "Barre, haltères, poulie et machines",
  "sessionsPerWeek": 3,
  "sessionMinutes": 55,
  "progression": "Progressez sur 6–12 reps en conservant une technique stable. Double progression à RIR 1–3 : augmentez d'abord les répétitions dans la fourchette indiquée, puis ajoutez 2,5 kg sur le haut du corps ou 5 kg sur le bas du corps quand le haut de fourchette est réussi sur toutes les séries. Deload toutes les 4 à 6 semaines.",
  "tags": ["débutant", "full body", "3 jours"]
}

## Repères de programmation utilisés

Les programmes du Lot 1 suivent des règles communes :

### Volume
Les nombres de séries varient selon le type d'exercice : 3 séries pour les mouvements de base lourds (squat, développé couché), 3 à 4 séries pour les exercices d'isolation, 4 séries pour les mollets. Les fourchettes de répétitions sont précisées pour chaque exercice dans le champ `reps`.

### RIR (Reps In Reserve)
Toutes les séries de résistance sont travaillées à **1 à 3 répétitions en réserve** (RIR 1–3), c'est-à-dire sans aller jusqu'à l'échec musculaire systématique. Cela permet de travailler l'hypertrophie et la force tout en limitant la fatigue nerveuse.

### Double progression
La méthode de progression est une **double progression** :
1. Augmenter d'abord les répétitions dans la fourchette prévue (ex. 6→12).
2. Quand toutes les séries atteignent le haut de la fourchette, **ajouter 2,5 kg** sur les mouvements du haut du corps et **5 kg** sur le bas du corps.

### Temps de repos par filière
Les temps de repos sont calibrés selon l'intensité :
- **120 secondes** : exercices lourds polyarticulaires (squat, développé couché, soulevé de terre)
- **90 secondes** : exercices de force modérée (rowing, développé épaules, tractions)
- **60 secondes** : exercices d'isolation (curl, extensions)
- **45 secondes** : exercices légers ou au poids du corps (mollets, abdominaux)

### Deload
Une semaine de **deload** (réduction du volume et/ou de l'intensité) est recommandée toutes les **4 à 6 semaines** pour permettre la récupération du système nerveux et prévenir les blessures.

```


