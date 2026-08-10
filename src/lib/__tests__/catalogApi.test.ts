type CatalogService = typeof import('../catalogApi');

const GATEWAY_BASE = 'https://lifesporttracker.duckdns.org';
const API_KEY = 'test-api-key';

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

function loadCatalogService(serverUrl?: string, apiKey?: string): CatalogService {
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
  return require('../catalogApi') as CatalogService;
}

function mockFetch(responseFactory: () => Promise<unknown>): jest.Mock {
  return jest.fn().mockImplementation(async () => {
    const result = await responseFactory();
    return typeof result === 'object' && result !== null ? result : {};
  }) as unknown as jest.Mock;
}

describe('catalogApi', () => {
  afterEach(() => {
    restoreEnv();
    jest.resetModules();
  });

  describe('serveur non configuré (URL vide)', () => {
    it('searchExercises retourne server-not-configured sans appel réseau', async () => {
      const { searchExercises } = loadCatalogService(undefined, API_KEY);
      const fetchImpl = mockFetch(async () => ({ ok: true, json: async () => ({ items: [], total: 0 }) }));
      const result = await searchExercises('push', 10, 0, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(result.kind).toBe('server-not-configured');
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('searchFoods retourne server-not-configured sans appel réseau', async () => {
      const { searchFoods } = loadCatalogService(undefined, API_KEY);
      const fetchImpl = mockFetch(async () => ({ ok: true, json: async () => ({ items: [], total: 0 }) }));
      const result = await searchFoods('riz', 10, 0, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(result.kind).toBe('server-not-configured');
      expect(fetchImpl).not.toHaveBeenCalled();
    });
  });


  describe('serveur configuré', () => {
    it('searchExercises trouve des exercices', async () => {
      const mockItems = [
        { id: 'push-up', name: 'Push-up', bodyPart: 'chest', target: 'chest', secondaryMuscles: [], equipment: 'body weight', instructions: [], gif: { a: '', b: '' } },
      ];
      const fetchImpl = mockFetch(async () => ({
        ok: true,
        json: async () => ({ items: mockItems, total: 1, limit: 10, offset: 0 }),
      }));
      const { searchExercises } = loadCatalogService(GATEWAY_BASE, API_KEY);
      const result = await searchExercises('push', 10, 0, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(result.kind).toBe('found');
      if (result.kind === 'found') {
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('push-up');
        expect(result.total).toBe(1);
      }
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[0][0]).toContain(`${GATEWAY_BASE}/v1/exercises`);
      expect(fetchImpl.mock.calls[0][0]).toContain('q=push');
    });

    it('searchFoods trouve des aliments', async () => {
      const mockItems = [
        { id: 'riz_cuit', name: 'Riz cuit', category: 'Féculents', unit: 'g', nutritionPer100g: { calories: 130, protein: 2.5, carbs: 28, fat: 0.3 }, isCustom: false },
      ];
      const fetchImpl = mockFetch(async () => ({
        ok: true,
        json: async () => ({ items: mockItems, total: 1, limit: 10, offset: 0 }),
      }));
      const { searchFoods } = loadCatalogService(GATEWAY_BASE, API_KEY);
      const result = await searchFoods('riz', 10, 0, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(result.kind).toBe('found');
      if (result.kind === 'found') {
        expect(result.items).toHaveLength(1);
        expect(result.items[0].id).toBe('riz_cuit');
      }
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[0][0]).toContain(`${GATEWAY_BASE}/v1/foods`);
      expect(fetchImpl.mock.calls[0][0]).toContain('q=riz');
    });

    it('retourne empty quand le serveur répond une liste vide', async () => {
      const fetchImpl = mockFetch(async () => ({
        ok: true,
        json: async () => ({ items: [], total: 0, limit: 10, offset: 0 }),
      }));
      const { searchExercises } = loadCatalogService(GATEWAY_BASE, API_KEY);
      const result = await searchExercises('inexistant', 10, 0, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(result.kind).toBe('empty');
    });

    it('retourne unavailable quand le serveur répond un statut non-OK', async () => {
      const fetchImpl = mockFetch(async () => ({ ok: false, status: 502 }));
      const { searchFoods } = loadCatalogService(GATEWAY_BASE, API_KEY);
      const result = await searchFoods('pizza', 10, 0, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(result.kind).toBe('unavailable');
    });

    it('retourne unavailable en cas de rejet réseau (fetch throw)', async () => {
      const fetchImpl = mockFetch(async () => { throw new Error('Network error'); });
      const { searchExercises } = loadCatalogService(GATEWAY_BASE, API_KEY);
      const result = await searchExercises('curl', 10, 0, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(result.kind).toBe('unavailable');
    });

    it('retourne unavailable en cas de timeout (AbortError)', async () => {
      // mockFetch ne supporte pas les signatures avec paramètres,
      // on utilise directement jest.fn() pour ce cas
      const fetchImpl = jest.fn(
        (_url: unknown, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError'))
            );
          })
      ) as unknown as jest.Mock;
      const { searchExercises } = loadCatalogService(GATEWAY_BASE, API_KEY);
      const result = await searchExercises('squat', 10, 0, { fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 20 });
      expect(result.kind).toBe('unavailable');
    });

    it('envoie les en-têtes Authorization', async () => {
      const fetchImpl = mockFetch(async () => ({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      }));
      const { searchFoods } = loadCatalogService(GATEWAY_BASE, API_KEY);
      await searchFoods('test', 10, 0, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(fetchImpl).toHaveBeenCalledWith(
        expect.stringContaining('/v1/foods'),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${API_KEY}` },
        })
      );
    });

    it('passe limit et offset dans les query params', async () => {
      const fetchImpl = mockFetch(async () => ({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      }));
      const { searchExercises } = loadCatalogService(GATEWAY_BASE, API_KEY);
      await searchExercises('bench', 25, 5, { fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(fetchImpl.mock.calls[0][0]).toContain('limit=25');
      expect(fetchImpl.mock.calls[0][0]).toContain('offset=5');
    });
  });
});
