import {
  foodIdForBarcode,
  mapOffCategoriesToAppCategory,
  mapOffProductToFood,
  offProductPageUrl,
  type OffProductResponse,
} from '../openFoodFacts';

type OffService = typeof import('../openFoodFacts');

const BARCODE = '3017620422003';
const GATEWAY_BASE = 'https://lifesporttracker.duckdns.org';
const API_KEY = 'test-api-key';

const nutellaResponse: OffProductResponse = {
  status: 1,
  code: BARCODE,
  product: {
    product_name: 'Nutella',
    brands: 'Ferrero,Nutella',
    categories_tags: ['en:spreads', 'en:sweet-spreads', 'en:chocolate-spreads'],
    serving_size: '15 g',
    nutriments: {
      'energy-kcal_100g': 539,
      proteins_100g: 6.3,
      carbohydrates_100g: 57.5,
      fat_100g: 30.9,
    },
  },
};

// `MEAL_SERVER_URL` / `MEAL_SERVER_API_KEY` sont lues à l'import du module.
// Les tests qui dépendent de la configuration serveur rechargent le module
// avec `process.env` contrôlé.
const originalServerUrl = process.env.EXPO_PUBLIC_MEAL_SERVER_URL;
const originalApiKey = process.env.EXPO_PUBLIC_MEAL_SERVER_API_KEY;

function restoreEnv() {
  if (originalServerUrl === undefined) {
    delete process.env.EXPO_PUBLIC_MEAL_SERVER_URL;
  } else {
    process.env.EXPO_PUBLIC_MEAL_SERVER_URL = originalServerUrl;
  }
  if (originalApiKey === undefined) {
    delete process.env.EXPO_PUBLIC_MEAL_SERVER_API_KEY;
  } else {
    process.env.EXPO_PUBLIC_MEAL_SERVER_API_KEY = originalApiKey;
  }
}

/** Charge un module frais avec la configuration serveur souhaitée. */
function loadOffService(serverUrl?: string, apiKey?: string): OffService {
  if (serverUrl === undefined) {
    delete process.env.EXPO_PUBLIC_MEAL_SERVER_URL;
  } else {
    process.env.EXPO_PUBLIC_MEAL_SERVER_URL = serverUrl;
  }
  if (apiKey === undefined) {
    delete process.env.EXPO_PUBLIC_MEAL_SERVER_API_KEY;
  } else {
    process.env.EXPO_PUBLIC_MEAL_SERVER_API_KEY = apiKey;
  }

  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../openFoodFacts') as OffService;
}

describe('buildOffProductUrl / offProductPageUrl / foodIdForBarcode', () => {
  afterEach(() => {
    restoreEnv();
    jest.resetModules();
  });

  it('construit l’URL de la passerelle /v1/products/<barcode>', () => {
    const { buildOffProductUrl } = loadOffService(GATEWAY_BASE, API_KEY);
    expect(buildOffProductUrl(BARCODE)).toBe(`${GATEWAY_BASE}/v1/products/${BARCODE}`);
  });

  it('lit la base depuis la configuration serveur (EXPO_PUBLIC_)', () => {
    const { buildOffProductUrl } = loadOffService('https://autre.example.org', 'cle-2');
    expect(buildOffProductUrl(BARCODE)).toBe(`https://autre.example.org/v1/products/${BARCODE}`);
  });

  it('construit la page produit publique et un id déterministe', () => {
    expect(offProductPageUrl(BARCODE)).toBe(`https://world.openfoodfacts.org/product/${BARCODE}`);
    expect(foodIdForBarcode(BARCODE)).toBe(`off_${BARCODE}`);
  });
});

describe('mapOffCategoriesToAppCategory', () => {
  it('mappe les tags OFF vers les catégories de l’app', () => {
    expect(mapOffCategoriesToAppCategory(['en:dairies', 'en:yogurts'])).toBe('Produits laitiers');
    expect(mapOffCategoriesToAppCategory(['en:beverages', 'en:sodas'])).toBe('Boissons');
    expect(mapOffCategoriesToAppCategory(['en:meats'])).toBe('Viande');
    expect(mapOffCategoriesToAppCategory(['en:fishes'])).toBe('Poisson');
    expect(mapOffCategoriesToAppCategory(['en:fruits'])).toBe('Fruits');
    expect(mapOffCategoriesToAppCategory(['en:vegetables'])).toBe('Légumes');
    expect(mapOffCategoriesToAppCategory(['en:legumes'])).toBe('Légumineuses');
    expect(mapOffCategoriesToAppCategory(['en:breads'])).toBe('Féculents');
    expect(mapOffCategoriesToAppCategory(['en:fats', 'en:vegetable-oils'])).toBe('Matières grasses');
    expect(mapOffCategoriesToAppCategory(['en:nuts'])).toBe('Noix & graines');
    expect(mapOffCategoriesToAppCategory(['en:eggs'])).toBe('Œufs');
    expect(mapOffCategoriesToAppCategory(['en:snacks', 'en:sweet-snacks'])).toBe('Snacks/Sucré');
  });

  it('retourne la catégorie de repli sans tag connu', () => {
    expect(mapOffCategoriesToAppCategory(['en:unknown-thing'])).toBe('Autres');
    expect(mapOffCategoriesToAppCategory([])).toBe('Autres');
    expect(mapOffCategoriesToAppCategory(undefined)).toBe('Autres');
  });
});

describe('mapOffProductToFood', () => {
  it('mappe un produit complet vers un Food custom', () => {
    const food = mapOffProductToFood(BARCODE, nutellaResponse);

    expect(food).toMatchObject({
      id: `off_${BARCODE}`,
      name: 'Nutella',
      brand: 'Ferrero',
      category: 'Snacks/Sucré',
      unit: 'g',
      nutritionPer100g: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
      barcode: BARCODE,
      sourceUrl: `https://world.openfoodfacts.org/product/${BARCODE}`,
      isCustom: true,
    });
  });

  it('retombe sur energy-kj_100g quand les kcal manquent', () => {
    const food = mapOffProductToFood(BARCODE, {
      status: 1,
      product: {
        product_name: 'Produit kj',
        nutriments: { 'energy-kj_100g': 418.4, proteins_100g: 1 },
      },
    });

    expect(food?.nutritionPer100g.calories).toBe(100);
    expect(food?.nutritionPer100g.carbs).toBe(0);
    expect(food?.nutritionPer100g.fat).toBe(0);
  });

  it('met les macros manquantes à 0 et ignore les valeurs invalides', () => {
    const food = mapOffProductToFood(BARCODE, {
      status: 1,
      product: {
        product_name: 'Produit partiel',
        nutriments: {
          'energy-kcal_100g': Number.NaN,
          proteins_100g: -2,
        },
      },
    });

    expect(food?.nutritionPer100g).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('omet la marque absente', () => {
    const food = mapOffProductToFood(BARCODE, {
      status: 1,
      product: { product_name: 'Sans marque', nutriments: {} },
    });

    expect(food).not.toBeNull();
    expect(food && 'brand' in food).toBe(false);
  });

  it('retourne null si produit introuvable ou sans nom', () => {
    expect(mapOffProductToFood(BARCODE, { status: 0 })).toBeNull();
    expect(mapOffProductToFood(BARCODE, { status: 1 })).toBeNull();
    expect(
      mapOffProductToFood(BARCODE, { status: 1, product: { product_name: '   ' } })
    ).toBeNull();
  });
});

describe('fetchOffFood', () => {
  afterEach(() => {
    restoreEnv();
    jest.resetModules();
  });

  function mockFetch(impl: (...args: any[]) => any) {
    return jest.fn(impl) as unknown as typeof fetch;
  }

  it('retourne found quand la passerelle répond un produit', async () => {
    const { fetchOffFood } = loadOffService(GATEWAY_BASE, API_KEY);
    const fetchImpl = mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => nutellaResponse,
    }));

    const result = await fetchOffFood(BARCODE, { fetchImpl });

    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(result.food.barcode).toBe(BARCODE);
      expect(result.food.isCustom).toBe(true);
      expect(result.food.sourceUrl).toBe(`https://world.openfoodfacts.org/product/${BARCODE}`);
    }
    expect(fetchImpl).toHaveBeenCalledWith(
      `${GATEWAY_BASE}/v1/products/${BARCODE}`,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        headers: { Authorization: `Bearer ${API_KEY}` },
      })
    );
  });

  it('retourne not-found sur status 0 ou HTTP 404', async () => {
    const { fetchOffFood } = loadOffService(GATEWAY_BASE, API_KEY);

    const statusZero = mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 0, code: BARCODE }),
    }));
    expect((await fetchOffFood(BARCODE, { fetchImpl: statusZero })).kind).toBe('not-found');

    const http404 = mockFetch(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    expect((await fetchOffFood(BARCODE, { fetchImpl: http404 })).kind).toBe('not-found');
  });

  it('retourne server-not-configured quand l’URL serveur est vide (fetch jamais appelé)', async () => {
    const { fetchOffFood } = loadOffService(undefined, API_KEY);
    const fetchImpl = mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => nutellaResponse,
    }));

    const result = await fetchOffFood(BARCODE, { fetchImpl });

    expect(result).toEqual({ kind: 'server-not-configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('retourne unavailable sur HTTP 502 (OpenFoodFacts injoignable)', async () => {
    const { fetchOffFood } = loadOffService(GATEWAY_BASE, API_KEY);
    const upstreamDown = mockFetch(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ error: { code: 'upstream_unavailable', message: '…' } }),
    }));

    expect((await fetchOffFood(BARCODE, { fetchImpl: upstreamDown })).kind).toBe('unavailable');
  });

  it('retourne unavailable sur réseau KO, timeout et autres statuts HTTP', async () => {
    const { fetchOffFood } = loadOffService(GATEWAY_BASE, API_KEY);

    const offline = mockFetch(async () => {
      throw new TypeError('Network request failed');
    });
    expect((await fetchOffFood(BARCODE, { fetchImpl: offline })).kind).toBe('unavailable');

    const hanging = mockFetch(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );
    expect((await fetchOffFood(BARCODE, { fetchImpl: hanging, timeoutMs: 20 })).kind).toBe(
      'unavailable'
    );

    for (const status of [500, 401]) {
      const httpError = mockFetch(async () => ({
        ok: false,
        status,
        json: async () => ({}),
      }));
      expect((await fetchOffFood(BARCODE, { fetchImpl: httpError })).kind).toBe('unavailable');
    }
  });
});
