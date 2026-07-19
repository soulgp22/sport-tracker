import type { Food, FoodNutrition, FoodUnit } from '../types';
import { assertImportTextSize } from './importLimits';

export interface FoodValidationResult {
  foods: Food[];
  errors: string[];
  duplicateIds: string[];
}

const requiredFoodFields = ['id', 'name', 'category', 'unit', 'nutritionPer100g'] as const;
const requiredNutritionFields = ['calories', 'protein', 'carbs', 'fat'] as const;
const optionalNutritionFields = ['fiber', 'sugar', 'salt'] as const;
const allowedUnits: FoodUnit[] = ['g', 'ml', 'portion', 'unité'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function labelForFood(value: unknown, index: number) {
  if (isRecord(value) && typeof value.name === 'string' && value.name.trim().length > 0) {
    return value.name.trim();
  }

  return `#${index + 1}`;
}

function addUnique(target: Set<string>, value: string) {
  if (value.trim().length > 0) {
    target.add(value);
  }
}

function readNonEmptyString(
  record: Record<string, unknown>,
  key: 'id' | 'name' | 'category',
  label: string,
  errors: string[]
) {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`Aliment ${label} : le champ "${key}" est obligatoire et doit être non vide.`);
    return null;
  }

  return value.trim();
}

function readOptionalString(
  record: Record<string, unknown>,
  key: 'brand' | 'retailer' | 'country' | 'barcode' | 'sourceUrl',
  label: string,
  errors: string[]
) {
  if (!(key in record)) return undefined;
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`Aliment ${label} : le champ optionnel "${key}" doit être une chaîne non vide.`);
    return undefined;
  }

  return value.trim();
}

function readUnit(record: Record<string, unknown>, label: string, errors: string[]) {
  const value = record.unit;
  if (typeof value !== 'string' || !allowedUnits.includes(value as FoodUnit)) {
    errors.push(`Aliment ${label} : l'unité doit être g, ml, portion ou unité.`);
    return null;
  }

  return value as FoodUnit;
}

function readNumber(
  nutrition: Record<string, unknown>,
  key: keyof FoodNutrition,
  label: string,
  errors: string[]
) {
  const value = nutrition[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    errors.push(`Aliment ${label} : nutritionPer100g.${key} doit être un nombre positif ou nul.`);
    return null;
  }

  return value;
}

function readNutrition(record: Record<string, unknown>, label: string, errors: string[]) {
  if (!isRecord(record.nutritionPer100g)) {
    errors.push(`Aliment ${label} : le champ "nutritionPer100g" doit être un objet.`);
    return null;
  }

  const nutrition: Partial<FoodNutrition> = {};

  for (const key of requiredNutritionFields) {
    const value = readNumber(record.nutritionPer100g, key, label, errors);
    if (value !== null) {
      nutrition[key] = value;
    }
  }

  for (const key of optionalNutritionFields) {
    if (key in record.nutritionPer100g) {
      const value = readNumber(record.nutritionPer100g, key, label, errors);
      if (value !== null) {
        nutrition[key] = value;
      }
    }
  }

  if (
    nutrition.calories === undefined ||
    nutrition.protein === undefined ||
    nutrition.carbs === undefined ||
    nutrition.fat === undefined
  ) {
    return null;
  }

  return nutrition as FoodNutrition;
}

function extractFoods(parsed: unknown, errors: string[]) {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (isRecord(parsed) && Array.isArray(parsed.foods)) {
    return parsed.foods;
  }

  errors.push("Le JSON doit contenir un tableau d'aliments ou un objet { foods: [...] }.");
  return [];
}

export function validateFoodsJson(
  text: string,
  existingIds: string[] = [],
  existingBarcodes: string[] = [],
): FoodValidationResult {
  const errors: string[] = [];
  const duplicateIdSet = new Set<string>();
  let parsed: unknown;

  try {
    assertImportTextSize(text);
    parsed = JSON.parse(text);
  } catch {
    return {
      foods: [],
      errors: ['JSON invalide : impossible de lire le fichier.'],
      duplicateIds: [],
    };
  }

  const rawFoods = extractFoods(parsed, errors);
  const fileIdCounts = new Map<string, number>();
  const existingIdSet = new Set(existingIds);
  const existingBarcodeSet = new Set(existingBarcodes.filter((b) => b.length > 0));

  // Track barcodes within the file for deduplication
  const barcodeToIds = new Map<string, Set<string>>();

  rawFoods.forEach((rawFood) => {
    if (!isRecord(rawFood) || typeof rawFood.id !== 'string' || rawFood.id.trim().length === 0) {
      return;
    }

    const id = rawFood.id.trim();
    fileIdCounts.set(id, (fileIdCounts.get(id) ?? 0) + 1);

    // Track barcodes for deduplication (only non-empty strings)
    if (typeof rawFood.barcode === 'string' && rawFood.barcode.trim().length > 0) {
      const barcode = rawFood.barcode.trim();
      if (!barcodeToIds.has(barcode)) {
        barcodeToIds.set(barcode, new Set());
      }
      barcodeToIds.get(barcode)!.add(id);
    }
  });

  for (const [id, count] of fileIdCounts) {
    if (count > 1) {
      addUnique(duplicateIdSet, id);
    }
    if (existingIdSet.has(id)) {
      addUnique(duplicateIdSet, id);
    }
  }

  // Dedup by barcode: reject entries whose barcode already exists
  // or appears more than once within the imported file
  for (const [barcode, ids] of barcodeToIds) {
    if (ids.size > 1 || existingBarcodeSet.has(barcode)) {
      for (const id of ids) {
        addUnique(duplicateIdSet, id);
      }
    }
  }

  const validFoods: Food[] = [];

  rawFoods.forEach((rawFood, index) => {
    const itemErrors: string[] = [];
    const label = labelForFood(rawFood, index);

    if (!isRecord(rawFood)) {
      errors.push(`Aliment ${label} : l'entrée doit être un objet.`);
      return;
    }

    for (const field of requiredFoodFields) {
      if (!(field in rawFood)) {
        itemErrors.push(`Aliment ${label} : champ requis "${field}" manquant.`);
      }
    }

    const id = readNonEmptyString(rawFood, 'id', label, itemErrors);
    const name = readNonEmptyString(rawFood, 'name', label, itemErrors);
    const category = readNonEmptyString(rawFood, 'category', label, itemErrors);
    const unit = readUnit(rawFood, label, itemErrors);
    const nutritionPer100g = readNutrition(rawFood, label, itemErrors);
    const brand = readOptionalString(rawFood, 'brand', label, itemErrors);
    const retailer = readOptionalString(rawFood, 'retailer', label, itemErrors);
    const country = readOptionalString(rawFood, 'country', label, itemErrors);
    const barcode = readOptionalString(rawFood, 'barcode', label, itemErrors);
    const sourceUrl = readOptionalString(rawFood, 'sourceUrl', label, itemErrors);

    if (id && duplicateIdSet.has(id)) {
      itemErrors.push(`Aliment ${label} : l'id "${id}" est déjà utilisé.`);
    }

    if (itemErrors.length > 0) {
      errors.push(...itemErrors);
      return;
    }

    validFoods.push({
      id: id as string,
      name: name as string,
      ...(brand ? { brand } : {}),
      ...(retailer ? { retailer } : {}),
      ...(country ? { country } : {}),
      category: category as string,
      unit: unit as FoodUnit,
      nutritionPer100g: nutritionPer100g as FoodNutrition,
      ...(barcode ? { barcode } : {}),
      ...(sourceUrl ? { sourceUrl } : {}),
      isCustom: true,
    });
  });

  return {
    foods: validFoods,
    errors,
    duplicateIds: [...duplicateIdSet].sort((a, b) => a.localeCompare(b, 'fr')),
  };
}
