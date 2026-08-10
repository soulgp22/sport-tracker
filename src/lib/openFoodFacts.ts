import type { Food } from '../types';
import { MEAL_SERVER_API_KEY, MEAL_SERVER_URL } from './mealPhotoApi';

/**
 * Scan de code-barres via la passerelle serveur
 * (GET {MEAL_SERVER_URL}/v1/products/<barcode>), proxy avec cache vers
 * Open Food Facts. Le format de réponse est identique à l'API v2
 * (mêmes champs filtrés) : `{ "status": 1, "product": { … } }` ou
 * `{ "status": 0 }` si introuvable — `mapOffProductToFood` reste inchangé.
 *
 * Attribution obligatoire : « Source : Open Food Facts » affichée dans l'UI
 * (modale de scan) et sourceUrl renseignée sur chaque aliment créé. La page
 * publique (`offProductPageUrl`) pointe toujours vers world.openfoodfacts.org.
 */

/** Site public Open Food Facts — lien affiché à l'utilisateur, pas un appel d'API. */
const OFF_PUBLIC_BASE = 'https://world.openfoodfacts.org';

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
  | { kind: 'server-not-configured' }
  | { kind: 'unavailable' };

/** Construit l'URL passerelle du produit (proxy OpenFoodFacts avec cache). */
export function buildOffProductUrl(barcode: string) {
  return `${MEAL_SERVER_URL}/v1/products/${encodeURIComponent(barcode)}`;
}

export function offProductPageUrl(barcode: string) {
  return `${OFF_PUBLIC_BASE}/product/${encodeURIComponent(barcode)}`;
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

function warnInDev(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[openFoodFacts] ${context}`, error);
  }
}

/**
 * Récupère un produit par code-barres via la passerelle serveur. Ne throw jamais.
 * Résultats possibles :
 * - `found` : produit trouvé et converti ;
 * - `not-found` : `{ "status": 0 }` ou HTTP 404 ;
 * - `server-not-configured` : `MEAL_SERVER_URL` vide — aucun appel réseau ;
 * - `unavailable` : réseau KO, timeout, HTTP 502 (ou tout statut non-OK).
 *
 * En cas d'indisponibilité, aucun produit n'est inventé : l'appelant affiche un
 * message explicite.
 */
export async function fetchOffFood(
  barcode: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<OffLookupResult> {
  if (!MEAL_SERVER_URL) return { kind: 'server-not-configured' };

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(buildOffProductUrl(barcode), {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${MEAL_SERVER_API_KEY}` },
    });

    if (response.status === 404) return { kind: 'not-found' };
    if (!response.ok) return { kind: 'unavailable' };

    const json = (await response.json()) as OffProductResponse;
    const food = mapOffProductToFood(barcode, json);
    return food ? { kind: 'found', food } : { kind: 'not-found' };
  } catch (error) {
    warnInDev('produit injoignable (réseau, timeout ou réponse invalide)', error);
    return { kind: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}
