import {
  buildOffProductUrl,
  fetchOffFood,
  foodIdForBarcode,
  mapOffCategoriesToAppCategory,
  mapOffProductToFood,
  offProductPageUrl,
  type OffProductResponse,
} from '../openFoodFacts';

const BARCODE = '3017620422003';

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

describe('buildOffProductUrl / offProductPageUrl / foodIdForBarcode', () => {
  it('construit une URL API v2 avec les champs nutriments', () => {
    const url = buildOffProductUrl(BARCODE);
    expect(url).toContain(`https://world.openfoodfacts.org/api/v2/product/${BARCODE}.json`);
    expect(url).toContain('product_name');
    expect(url).toContain('nutriments');
  });

  it('construit la page produit et un id déterministe', () => {
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
  function mockFetch(impl: (...args: any[]) => any) {
    return jest.fn(impl) as unknown as typeof fetch;
  }

  it('retourne found quand l’API répond un produit', async () => {
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
    }
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v2/product/${BARCODE}.json`),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('retourne not-found sur status 0 ou HTTP 404', async () => {
    const statusZero = mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 0, code: BARCODE }),
    }));
    expect((await fetchOffFood(BARCODE, { fetchImpl: statusZero })).kind).toBe('not-found');

    const http404 = mockFetch(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    expect((await fetchOffFood(BARCODE, { fetchImpl: http404 })).kind).toBe('not-found');
  });

  it('retourne error sur HTTP 500, réseau KO et timeout', async () => {
    const http500 = mockFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    expect((await fetchOffFood(BARCODE, { fetchImpl: http500 })).kind).toBe('error');

    const offline = mockFetch(async () => {
      throw new TypeError('Network request failed');
    });
    expect((await fetchOffFood(BARCODE, { fetchImpl: offline })).kind).toBe('error');

    const hanging = mockFetch(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );
    expect((await fetchOffFood(BARCODE, { fetchImpl: hanging, timeoutMs: 20 })).kind).toBe('error');
  });
});
