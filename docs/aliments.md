# Aliments

## Le modèle `Food`

Un aliment est représenté par l'interface suivante (définie dans `src/types/nutrition.ts`) :

```typescript
interface Food {
  id: string;                   // identifiant unique
  name: string;                 // nom affiché
  brand?: string;               // marque
  retailer?: string;            // enseigne
  country?: string;             // pays d'origine
  category: string;             // catégorie (parmi les 12 ci-dessous)
  unit: FoodUnit;               // unité de mesure
  nutritionPer100g: FoodNutrition; // valeurs nutritionnelles pour 100g/ml
  barcode?: string;             // code-barres EAN
  sourceUrl?: string;           // URL source (Open Food Facts)
  isCustom: boolean;            // true si ajouté par l'utilisateur
}
```

## Les 12 catégories

Les catégories autorisées sont définies dans `src/data/foods.default.json` et validées par `scripts/validate-community.mjs` :

1. **Viande** — poulet, boeuf, porc, charcuterie
2. **Poisson** — poissons, fruits de mer, conserves
3. **Œufs** — œufs et ovoproduits
4. **Produits laitiers** — lait, fromages, yaourts, crème
5. **Féculents** — pain, pâtes, riz, céréales, pommes de terre
6. **Légumes** — légumes frais, surgelés, en conserve
7. **Fruits** — fruits frais, secs, compotes
8. **Légumineuses** — lentilles, pois chiches, haricots, tofu
9. **Matières grasses** — huiles, beurres, margarines
10. **Noix & graines** — amandes, noix, beurre de cacahuète, graines
11. **Boissons** — eaux, jus, sodas, cafés, thés, boissons végétales
12. **Snacks/Sucré** — biscuits, chocolat, confiseries, chips, pâtes à tartiner, barres

## Unités autorisées

Quatre unités sont acceptées :

| Unité | Usage |
|-------|-------|
| `"g"` | Aliments solides (par défaut) |
| `"ml"` | Boissons et liquides |
| `"portion"` | Aliments mesurés à la portion |
| `"unité"` | Aliments comptés à l'unité (ex. œuf, pomme) |

Les produits Open Food Facts catégorisés comme boissons (`beverages`, `drinks`, `sodas`, `juices`, `water`, `milk`, etc.) se voient automatiquement attribuer l'unité `"ml"`. Tous les autres reçoivent `"g"`.

## Organisation par pays des bases communautaires

Les bases d'aliments communautaires sont organisées **par pays** dans `community/`. Chaque fichier couvre plusieurs enseignes du pays.

### Pays et enseignes couvertes

| Pays | Fichier | Enseignes |
|------|---------|-----------|
| France | `foods-france.json` | Carrefour, Auchan, E.Leclerc |
| Espagne | `foods-espagne.json` | Mercadona, Carrefour, Lidl |
| Allemagne | `foods-allemagne.json` | Edeka, Rewe, Aldi |
| Italie | `foods-italie.json` | Coop, Conad, Esselunga |
| Belgique | `foods-belgique.json` | Delhaize, Colruyt, Carrefour |
| Royaume-Uni | `foods-royaume-uni.json` | Tesco, Sainsbury's, Asda |

Des bases spécifiques par enseigne existent également (champ `retailer` historique) :
- `foods-auchan-fr.json` — Auchan France
- `foods-carrefour-fr.json` — Carrefour France

### Structure d'un pack pays (extrait de `community/foods-france.json`)

```json
{
  "version": 1,
  "source": {
    "name": "Produits France — Open Food Facts",
    "country": "France",
    "retailers": ["Carrefour", "Auchan", "E.Leclerc"],
    "official": false,
    "license": "ODbL — Open Food Facts",
    "attribution": "https://world.openfoodfacts.org",
    "disclaimer": "Sélection communautaire indicative issue d'Open Food Facts. Vérifier les valeurs sur l'emballage avant utilisation."
  },
  "foods": [
    {
      "id": "off_france_7622210449283",
      "name": "Prince Goût Chocolat au blé complet",
      "brand": "Mondelez",
      "retailer": "Carrefour",
      "country": "France",
      "category": "Snacks/Sucré",
      "unit": "g",
      "nutritionPer100g": {
        "calories": 466,
        "protein": 6.3,
        "carbs": 68,
        "fat": 17,
        "fiber": 3,
        "sugar": 32,
        "salt": 0.51
      },
      "barcode": "7622210449283",
      "sourceUrl": "https://world.openfoodfacts.org/product/7622210449283"
    }
  ]
}
```

### Manifeste `community/index.json` — entrée foodDatabases

```json
{
  "id": "foods-france",
  "name": "Produits France — Open Food Facts",
  "description": "Une sélection communautaire de produits français issus d'Open Food Facts.",
  "author": "Communauté Life Sport Tracker",
  "country": "France",
  "retailers": ["Carrefour", "Auchan", "E.Leclerc"],
  "foodsCount": 53,
  "format": "json",
  "file": "foods-france.json",
  "license": "ODbL — Open Food Facts",
  "attribution": "https://world.openfoodfacts.org",
  "disclaimer": "Sélection communautaire indicative issue d'Open Food Facts. Vérifiez les valeurs sur l'emballage avant utilisation."
}
```

Le champ `foodsCount` doit correspondre exactement au nombre d'aliments dans le fichier. Le validateur (`npm run validate:community`) vérifie cette correspondance. Le champ `retailers` (pluriel) est utilisé pour les bases par pays ; le champ historique `retailer` (singulier) reste pris en charge pour les bases par enseigne.

## D'où viennent les données

### Source : Open Food Facts

Les données sont extraites de l'API publique d'**Open Food Facts** (`https://world.openfoodfacts.org`).

### Licence ODbL

Les packs Open Food Facts utilisent la licence **ODbL** (Open Database License). L'attribution obligatoire est `https://world.openfoodfacts.org`.

### Génération

Le script `scripts/fetch-openfoodfacts.mjs` interroge l'API OFF par pays et par enseigne. Il applique des filtres qualité stricts avant d'écrire les fichiers dans `community/`.

## Filtres qualité appliqués par le script

Le script `fetch-openfoodfacts.mjs` applique les vérifications suivantes à chaque produit (`processProduct`) :

1. **Nom présent** : le produit doit avoir un `product_name` non vide.
2. **Macronutriments présents** : les 4 champs obligatoires (`energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g`, `fat_100g`) doivent exister (`isPlausibleNutrition`).
3. **Plages plausibles** : calories 0–900 kcal/100g, protéines/glucides/lipides 0–100 g/100g.
4. **Cohérence énergétique** : l'écart entre les kcal déclarées et le calcul théorique (4×prot + 4×glucides + 9×lipides) doit être ≤ 30% (`energyConsistent`, tolérance = 0.3).
5. **Mapping de catégorie EXACT** : le produit doit correspondre à exactement une des 12 catégories via un dictionnaire de slugs OFF (`mapCategory`). Si aucune catégorie ne correspond, le produit est **rejeté** (raison `unmapped-category`).
6. **Code-barres** : le produit doit avoir un `code` non vide (raison `no-barcode`).
7. **Déduplication** : par code-barres d'abord, puis par nom normalisé (`dedupe`).

Exemple de rapport en sortie :
```
France: 53 foods written
  Carrefour      fetched: 40  accepted: 20  rejected: 20  (50%)
    ↳ unmapped-category:12, energy-inconsistent:5, macro-oob:3
  Auchan         fetched: 40  accepted: 15  rejected: 25  (38%)
    ↳ unmapped-category:18, no-barcode:7
  E.Leclerc      fetched: 40  accepted: 18  rejected: 22  (45%)
  → deduplication removed 5
```




## Limites honnêtes

- **Base collaborative** : les données proviennent d'Open Food Facts, une base collaborative où n'importe qui peut contribuer. Des erreurs peuvent subsister.
- **Fiches incomplètes ou datées** : les recettes et valeurs nutritionnelles évoluent. Une fiche peut correspondre à une ancienne version du produit.
- **Mapping de catégorie strict** : de nombreux produits sont rejetés car leur catégorisation OFF ne correspond à aucune des 12 catégories de l'application. Cela réduit la couverture mais garantit la qualité.
- **Vérifier l'emballage** : chaque base inclut un `disclaimer` rappelant de toujours vérifier les valeurs sur l'emballage du produit avant utilisation.
- **Bases non officielles** : ces sélections ne sont pas affiliées aux enseignes concernées.
