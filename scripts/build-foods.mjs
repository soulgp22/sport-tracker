import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const foodsPath = path.resolve(__dirname, '../src/data/foods.default.json');
const requiredFoodFields = ['id', 'name', 'category', 'unit', 'nutritionPer100g', 'isCustom'];
const requiredNutritionFields = ['calories', 'protein', 'carbs', 'fat'];
const allowedUnits = new Set(['g', 'ml', 'portion', 'unité']);

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readLabel(food, index) {
  if (isRecord(food) && typeof food.name === 'string' && food.name.trim()) {
    return food.name.trim();
  }

  return `index ${index}`;
}

function validateFood(food, index, ids, errors) {
  const label = readLabel(food, index);

  if (!isRecord(food)) {
    errors.push(`Aliment ${label} invalide : objet attendu.`);
    return;
  }

  for (const field of requiredFoodFields) {
    if (!(field in food)) {
      errors.push(`Aliment ${label} invalide : champ "${field}" manquant.`);
    }
  }

  if (typeof food.id !== 'string' || !food.id.trim()) {
    errors.push(`Aliment ${label} invalide : id vide ou non textuel.`);
  } else if (ids.has(food.id)) {
    errors.push(`Aliment ${label} invalide : id "${food.id}" en doublon.`);
  } else {
    ids.add(food.id);
  }

  if (typeof food.name !== 'string' || !food.name.trim()) {
    errors.push(`Aliment ${label} invalide : name vide ou non textuel.`);
  }

  if (typeof food.category !== 'string' || !food.category.trim()) {
    errors.push(`Aliment ${label} invalide : category vide ou non textuel.`);
  }

  if (typeof food.unit !== 'string' || !allowedUnits.has(food.unit)) {
    errors.push(`Aliment ${label} invalide : unit non reconnue.`);
  }

  if (food.isCustom !== false) {
    errors.push(`Aliment ${label} invalide : isCustom doit valoir false.`);
  }

  if (!isRecord(food.nutritionPer100g)) {
    errors.push(`Aliment ${label} invalide : nutritionPer100g doit être un objet.`);
    return;
  }

  for (const field of requiredNutritionFields) {
    const value = food.nutritionPer100g[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      errors.push(`Aliment ${label} invalide : nutritionPer100g.${field} doit être un nombre positif ou nul.`);
    }
  }

  for (const field of ['fiber', 'sugar', 'salt']) {
    if (field in food.nutritionPer100g) {
      const value = food.nutritionPer100g[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        errors.push(`Aliment ${label} invalide : nutritionPer100g.${field} doit être un nombre positif ou nul.`);
      }
    }
  }
}

const text = await readFile(foodsPath, 'utf8');
const foods = JSON.parse(text);

if (!Array.isArray(foods)) {
  throw new Error('foods.default.json doit contenir un tableau.');
}

const errors = [];
const ids = new Set();
const byCategory = new Map();

foods.forEach((food, index) => {
  validateFood(food, index, ids, errors);
  if (isRecord(food) && typeof food.category === 'string' && food.category.trim()) {
    const category = food.category.trim();
    byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
  }
});

if (errors.length > 0) {
  console.error(`foods.default.json invalide (${errors.length} erreur(s)) :`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`${foods.length} aliments valides.`);
  console.log('Résumé par catégorie :');
  for (const [category, count] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'))) {
    console.log(`- ${category}: ${count}`);
  }
}
