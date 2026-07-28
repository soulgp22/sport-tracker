import type { Food } from '../types';

/**
 * Open Food Facts (https://world.openfoodfacts.org) — données sous licence ODbL.
 * Attribution obligatoire : « Source : Open Food Facts » affichée dans l'UI
 * (modale de scan) et sourceUrl renseignée sur chaque aliment créé.
 */

const API_BASE = 'https://world.openfoodfacts.org';
const PRODUCT_FIELDS =
  'product_name,brands,categories_tags,serving_size,nutriments.energy-kcal_100g,nutriments.energy-kj_100g,nutriments.proteins_100g,nutriments.carbohydrates_100g,nutriments.fat_100g';

const DEFAULT_TIMEOUT_MS = 8000;

export interface OffNutriments {
  'energy-kcal_100g'?: number;
  'energy-kj_100g'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

export interface OffProduct {
  product_name?: string;
  brands?: string;
  categories_tags?: string[];
  serving_size?: string;
  nutriments?: OffNutriments;
}

export interface OffProductResponse {
  status?: number;
  code?: string;
  product?: OffProduct;
}

export type OffLookupResult =
  | { kind: 'found'; food: Food }
  | { kind: 'not-found' }
  | { kind: 'error' };

export function buildOffProductUrl(barcode: string) {
  return `${API_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${PRODUCT_FIELDS}`;
}

export function offProductPageUrl(barcode: string) {
  return `${API_BASE}/product/${encodeURIComponent(barcode)}`;
}

export function foodIdForBarcode(barcode: string) {
  return `off_${barcode}`;
}

/** Règles ordonnées : la première qui matche un `categories_tags` OFF gagne. */
const CATEGORY_RULES: { needles: string[]; category: string }[] = [
  { needles: ['beverage', 'drink', 'water', 'juice', 'soda', 'tea', 'coffee'], category: 'Boissons' },
  { needles: ['dair', 'milk', 'yogurt', 'cheese', 'cream'], category: 'Produits laitiers' },
  { needles: ['egg'], category: 'Œufs' },
  // Avant Fruits/Légumes : "en:vegetable-oils" doit matcher "oil", pas "vegetable".
  { needles: ['fat', 'oil', 'butter', 'margarine'], category: 'Matières grasses' },
  { needles: ['meat', 'poultry', 'charcut', 'ham', 'sausage'], category: 'Viande' },
  { needles: ['fish', 'seafood'], category: 'Poisson' },
  { needles: ['fruit'], category: 'Fruits' },
  { needles: ['vegetable'], category: 'Légumes' },
  { needles: ['legume', 'lentil', 'chickpea', 'bean'], category: 'Légumineuses' },
  {
    needles: ['cereal', 'bread', 'pasta', 'rice', 'potato', 'flour', 'breakfast'],
    category: 'Féculents',
  },
  { needles: ['nut', 'seed', 'almond', 'hazelnut'], category: 'Noix & graines' },
  {
    needles: ['sweet', 'snack', 'dessert', 'chocolate', 'biscuit', 'cake', 'cand', 'confection'],
    category: 'Snacks/Sucré',
  },
];

export const OFF_FALLBACK_CATEGORY = 'Autres';

/** Mappe les `categories_tags` OFF (ex. "en:dairies") vers une catégorie de l'app. */
export function mapOffCategoriesToAppCategory(categoriesTags?: string[]): string {
  const tags = (categoriesTags ?? []).map((tag) => tag.toLowerCase().replace(/^[a-z]{2,}:/, ''));

  for (const rule of CATEGORY_RULES) {
    if (tags.some((tag) => rule.needles.some((needle) => tag.includes(needle)))) {
      return rule.category;
    }
  }

  return OFF_FALLBACK_CATEGORY;
}

function toNonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Convertit une réponse API v2 en Food custom, ou null si le produit est inexploitable. */
export function mapOffProductToFood(barcode: string, response: OffProductResponse): Food | null {
  if (!response || response.status !== 1 || !response.product) return null;

  const product = response.product;
  const name = (product.product_name ?? '').trim();
  if (!name) return null;

  const nutriments = product.nutriments ?? {};
  const kcal = toNonNegativeNumber(nutriments['energy-kcal_100g']);
  const kj = toNonNegativeNumber(nutriments['energy-kj_100g']);
  const calories = kcal ?? (kj !== null ? Math.round(kj / 4.184) : 0);
  const brand = (product.brands ?? '').split(',')[0].trim();

  return {
    id: foodIdForBarcode(barcode),
    name,
    ...(brand ? { brand } : {}),
    category: mapOffCategoriesToAppCategory(product.categories_tags),
    unit: 'g',
    nutritionPer100g: {
      calories,
      protein: toNonNegativeNumber(nutriments.proteins_100g) ?? 0,
      carbs: toNonNegativeNumber(nutriments.carbohydrates_100g) ?? 0,
      fat: toNonNegativeNumber(nutriments.fat_100g) ?? 0,
    },
    barcode,
    sourceUrl: offProductPageUrl(barcode),
    isCustom: true,
  };
}

/**
 * Récupère un produit OFF par code-barres. Ne throw jamais : les erreurs
 * réseau/offline/timeout ressortent en `{ kind: 'error' }`.
 */
export async function fetchOffFood(
  barcode: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<OffLookupResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(buildOffProductUrl(barcode), { signal: controller.signal });

    if (response.status === 404) return { kind: 'not-found' };
    if (!response.ok) return { kind: 'error' };

    const json = (await response.json()) as OffProductResponse;
    const food = mapOffProductToFood(barcode, json);
    return food ? { kind: 'found', food } : { kind: 'not-found' };
  } catch {
    return { kind: 'error' };
  } finally {
    clearTimeout(timer);
  }
}
