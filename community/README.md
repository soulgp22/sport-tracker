# Communauté Life Sport Tracker

Le fichier `index.json` référence les contenus téléchargeables depuis l’application.

- `programs` contient les programmes sportifs JSON.
- `foodDatabases` contient les bases d’aliments JSON ou CSV.

Chaque fichier distant est limité à 5 Mo par l’application et son nom doit rester un nom de
fichier simple, sans sous-dossier. Les bases commerciales doivent être présentées comme
communautaires et non officielles, avec une invitation à vérifier les valeurs sur l’emballage.

Pour ajouter une enseigne, créer son fichier dans ce dossier puis ajouter une entrée dans
`foodDatabases` avec un identifiant unique, le nombre d’aliments, le format et l’avertissement.

## Packs de programmes

Les packs sportifs utilisent la version 1 et ne contiennent que le nom du programme, ses jours,
ses exercices et ses séries. Tous les `exerciseName` et `alternativeExerciseNames` doivent être
strictement identiques au champ `name` d’une entrée de `src/data/exercises.catalog.json`.

Le manifeste porte les informations éditoriales. En plus des champs historiques, une entrée de
`programs` peut exposer `goal`, `equipment`, `sessionsPerWeek`, `sessionMinutes`, `progression` et
`tags`. Les compteurs `daysCount` et `exercisesCount` décrivent le contenu réel du fichier.

Les programmes du Lot 1 suivent ces règles communes :

- travailler les séries de résistance à 1–3 répétitions en réserve (RIR), sans échec systématique ;
- utiliser une double progression : augmenter d’abord les répétitions dans la fourchette prévue,
  puis ajouter 2,5 kg sur le haut du corps ou 5 kg sur le bas du corps lorsque toutes les séries
  atteignent le haut de la fourchette ;
- effectuer un deload toutes les 4 à 6 semaines ;
- conserver `weight` à `0`, la charge étant renseignée par l’utilisateur ;
- pour les exercices isométriques ou au temps (par exemple `Plank`, `Side Bridge`, les sprints ou
  la corde), `reps` représente un nombre de **secondes**, et non des répétitions.

Lancer `npm run validate:community` avant publication pour contrôler les JSON, les références du
manifeste, les compteurs et tous les noms d’exercices.
