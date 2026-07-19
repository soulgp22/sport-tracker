# Maintenance

## Lancer les scripts

### Validation de la communauté

```bash
npm run validate:community
```

Ce script (`scripts/validate-community.mjs`) contrôle l'intégrité de tous les fichiers de `community/` :

- Validité JSON de tous les fichiers
- Cohérence du manifeste `index.json` (ids uniques, fichiers référencés existants)
- Pour les programmes : noms d'exercices dans le catalogue, `weight = 0`, `reps`/`restSeconds` entiers positifs, compteurs `daysCount`/`exercisesCount` exacts
- Pour les aliments : catégories autorisées, unités valides, plages nutritionnelles, doublons d'ids, codes-barres valides
- Pour les bases Open Food Facts : vérification de la licence et attribution

Sortie en cas de succès :
```
Validation Community réussie : X fichiers JSON valides, N programmes et M aliments contrôlés.
```

Sortie en cas d'erreur :
```
Validation Community échouée (N erreur(s)) :
- community/index.json : full-body-3.exercisesCount=15, contenu=14.
- community/mon-pack.json, jour 1, exercice 3 : exerciseName hors catalogue « Superman Push-Up ».
```

### Récupération des données Open Food Facts

```bash
node scripts/fetch-openfoodfacts.mjs [options]
```

Options :
| Option | Description |
|--------|-------------|
| `--limit N` | Nombre de produits à récupérer par enseigne (défaut : 40). |
| `--country X` | Filtrer sur un pays spécifique (ex. `France`). |
| `--dry-run` | Simuler sans écrire de fichiers. |

Exemples :
```bash
# Récupérer 20 produits par enseigne, tous pays
node scripts/fetch-openfoodfacts.mjs --limit 20

# Récupérer uniquement la France, 50 produits par enseigne
node scripts/fetch-openfoodfacts.mjs --country France --limit 50

# Simuler sans écrire
node scripts/fetch-openfoodfacts.mjs --dry-run
```

Après exécution, un rapport détaillé est affiché pour chaque pays et chaque enseigne, avec les taux d'acceptation et les raisons de rejet (voir [docs/aliments.md](aliments.md) pour le détail des filtres).

**Important** : toujours relancer `npm run validate:community` après avoir régénéré les bases pour synchroniser les `foodsCount` du manifeste.

## Lancer les tests

```bash
npm test
```

Exécute la suite de tests Jest. Le preset utilisé est `jest-expo`. Les tests sont lancés avec `--runInBand` (exécution séquentielle).

Configuration : `jest.config.js` à la racine.

## Typecheck

```bash
npx tsc --noEmit
```

Vérifie la cohérence des types TypeScript sans émettre de fichiers compilés.

## Toutes les validations appliquées

### Validation des programmes (`validate-community.mjs`)

| Contrôle | Message d'erreur |
|----------|-----------------|
| JSON invalide | `community/fichier.json : JSON invalide (message).` |
| `exerciseName` hors catalogue | `community/fichier.json, jour 1, exercice 1 : exerciseName hors catalogue « Nom ».` |

### Validation des aliments (`validate-community.mjs`)

| Contrôle | Message d'erreur |
|----------|-----------------|
| Tableau `foods` manquant | `community/fichier.json : format invalide, tableau foods manquant.` |
| `foodsCount` inexact | `community/index.json : id.foodsCount=X, contenu=Y.` |
| Id manquant | `community/fichier.json, aliment 1 : id manquant ou invalide.` |
| Id dupliqué dans le fichier | `community/fichier.json, aliment 1 : id dupliqué dans le fichier « X ».` |
| Id dupliqué entre fichiers | `community/fichier.json, aliment 1 : id dupliqué entre fichiers « X » (déjà dans Y).` |
| Catégorie hors liste | `community/fichier.json, aliment 1 : catégorie hors liste de l'app « X ».` |
| Unité invalide | `community/fichier.json, aliment 1 : unité invalide « X ».` |
| `nutritionPer100g` manquant | `community/fichier.json, aliment 1 : nutritionPer100g manquant ou invalide.` |
| Calories hors plage | `community/fichier.json, aliment 1 : calories hors plage 0–900.` |
| Macro hors plage | `community/fichier.json, aliment 1 : protein hors plage 0–100.` |
| Macro optionnelle hors plage | `community/fichier.json, aliment 1 : fiber hors plage 0–100.` |
| Code-barres invalide (OFF) | `community/fichier.json, aliment 1 : code-barres invalide « X ».` |
| Licence/attribution manquante (OFF) | `community/fichier.json : fichier Open Food Facts sans licence ou attribution.` |
| Format non JSON | `community/fichier.json : seules les bases d'aliments JSON sont validées.` |

### Validation à l'import (`foodValidation.ts`)

| Contrôle | Message d'erreur |
|----------|-----------------|
| JSON invalide | `JSON invalide : impossible de lire le fichier.` |
| Structure invalide | `Le JSON doit contenir un tableau d'aliments ou un objet { foods: [...] }.` |
| Champ requis manquant | `Aliment Nom : champ requis "id" manquant.` |
| `id` non vide | `Aliment Nom : le champ "id" est obligatoire et doit être non vide.` |
| Unité invalide | `Aliment Nom : l'unité doit être g, ml, portion ou unité.` |
| Nutrition invalide | `Aliment Nom : nutritionPer100g.calories doit être un nombre positif ou nul.` |
| `nutritionPer100g` pas un objet | `Aliment Nom : le champ "nutritionPer100g" doit être un objet.` |
| Id en double | `Aliment Nom : l'id "X" est déjà utilisé.` |
| Entrée pas un objet | `Aliment Nom : l'entrée doit être un objet.` |

## Comment éviter les doublons

- **Dans un même fichier** : utiliser des ids uniques. Le script `fetch-openfoodfacts.mjs` génère des ids au format `off_<pays>_<code-barres>` et déduplique automatiquement.
- **Entre fichiers** : ne pas copier un aliment d'un fichier pays vers un autre. Le validateur détecte les ids en double entre fichiers.
- **À l'import utilisateur** : le `validateFoodsJson` vérifie les doublons avec les aliments existants (par défaut + personnalisés).

## Comment mettre à jour les données

### Mise à jour des bases Open Food Facts

1. Lancer le script de récupération :
   ```bash
   node scripts/fetch-openfoodfacts.mjs --country France --limit 50
   ```
2. Mettre à jour les `foodsCount` dans `community/index.json` pour chaque base régénérée.
3. Valider :
   ```bash
   npm run validate:community
   ```

### Mise à jour d'un programme

1. Modifier le fichier JSON dans `community/`.
2. Mettre à jour les métadonnées dans `community/index.json` si nécessaire.
3. Valider :
   ```bash
   npm run validate:community
   ```

| Alternative hors catalogue | `community/fichier.json, jour 1, exercice 1 : alternative hors catalogue « Nom ».` |

## Comment revenir en arrière en cas d'échec

Si une régénération de base produit des résultats incorrects ou incomplets :

### Restaurer un fichier spécifique via Git

```bash
git checkout -- community/foods-france.json
```

Cela restaure le fichier à son dernier état commité.

### Annuler un commit de données

Si les données ont déjà été commitées :

```bash
git revert HEAD
```

Cela crée un nouveau commit qui annule les modifications du dernier commit.

### Re-génération propre

Après avoir restauré les fichiers, relancer la génération avec des paramètres plus conservateurs :

```bash
node scripts/fetch-openfoodfacts.mjs --country France --limit 20 --dry-run
```

Vérifier le rapport avant d'exécuter sans `--dry-run`.

### Restaurer tout le dossier community/

```bash
git checkout -- community/
```

> **Règle d'or** : ne jamais committer une base vide ou manifestement incomplète. Si le script produit 0 aliments valides, il affiche `⚠ No valid products – skipping file write.` et n'écrase pas le fichier existant. Mais si le fichier est partiellement régénéré avec très peu d'aliments, vérifier le rapport et utiliser `git checkout` si nécessaire.

## Que faire si l'API Open Food Facts renvoie une erreur

Le script `fetch-openfoodfacts.mjs` gère plusieurs cas d'erreur :

### Erreur permanente (API down, réseau)

Le rapport affiche `⚠ API-ERROR` pour l'enseigne concernée :

```
France: 0 foods written
  Carrefour      ⚠ API-ERROR
```

Le script poursuit avec les autres enseignes/pays plutôt que d'abandonner.

### Rate limiting (HTTP 429)

Le script retente automatiquement jusqu'à 5 fois avec un délai exponentiel (1s, 2s, 4s, 8s, 16s, max 60s).

### Réponse non-JSON

Si l'API renvoie du HTML (ex. page d'erreur Cloudflare), le script détecte que le corps commence par `<` et traite cela comme une erreur API.

### Base vide

Si après filtrage aucun produit valide n'est retenu pour un pays, le script **n'écrit pas le fichier** (et ne l'efface pas) :
```
⚠ No valid products – skipping file write.
```

### Règle à suivre

> **Ne pas committer une base vide.** Si le script produit `API-ERROR` sur toutes les enseignes d'un pays, le fichier existant reste inchangé. Ne pas forcer un commit qui écraserait des données valides par un fichier vide.

| `sets` vide ou invalide | `community/fichier.json, jour 1, exercice 1 : sets doit être un tableau non vide.` |
| `reps`/`restSeconds` invalides ou `weight ≠ 0` | `community/fichier.json, jour 1, exercice 1, série 1 : reps/restSeconds invalides ou weight différent de 0.` |
| `alternativeExerciseNames` pas un tableau | `community/fichier.json, jour 1, exercice 1 : alternativeExerciseNames doit être un tableau.` |
| Nom programme ≠ manifeste | `community/fichier.json : le nom « X » diffère du manifeste « Y ».` |
| Nom programme dupliqué | `community/fichier.json : nom de programme dupliqué « X ».` |
| `daysCount` inexact | `community/index.json : id.daysCount=X, contenu=Y.` |
| `exercisesCount` inexact | `community/index.json : id.exercisesCount=X, contenu=Y.` |
| Id dupliqué dans le manifeste | `community/index.json : id dupliqué « X ».` |
| Fichier référencé introuvable | `community/index.json : fichier référencé introuvable « fichier.json » (id).` |
