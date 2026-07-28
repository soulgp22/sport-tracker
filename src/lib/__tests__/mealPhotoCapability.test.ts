/**
 * Tests du gating mealPhoto : sous Jest (plateforme non Android), la feature
 * doit être désactivée et le module executorch ne doit JAMAIS être chargé.
 * Les tests de téléchargement mockent react-native + expo + executorch.
 */

type CapabilityService = typeof import('../mealPhotoCapability');

const MODEL_SOURCES = {
  modelSource: 'https://hf.co/model.pte',
  tokenizerSource: 'https://hf.co/tokenizer.json',
  tokenizerConfigSource: 'https://hf.co/tokenizer_config.json',
};

/** filenameFromUri('https://hf.co/model.pte') → 'hf.co_model.pte', etc. */
const FINAL_DIR = 'file:///docs/react-native-executorch/';
const MODEL_FINAL_URI = `${FINAL_DIR}hf.co_model.pte`;
const TOKENIZER_FINAL_URI = `${FINAL_DIR}hf.co_tokenizer.json`;
const CONFIG_FINAL_URI = `${FINAL_DIR}hf.co_tokenizer_config.json`;
const MODEL_CACHE_URI = 'file:///cache/hf.co_model.pte';

function loadService(): CapabilityService {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../mealPhotoCapability') as CapabilityService;
}

/** Mocke react-native (Android 34) + expo-device + executorch + fs legacy. */
function mockAndroidDevice(existingFiles: Map<string, number>) {
  jest.doMock('react-native', () => ({ Platform: { OS: 'android', Version: 34 } }));
  jest.doMock('expo-device', () => ({ totalMemory: 8 * 1024 * 1024 * 1024 }));
  jest.doMock('react-native-executorch', () => ({
    GEMMA4_E2B_MM: MODEL_SOURCES,
  }));
  const deleteAsync = jest.fn(async (uri: string) => {
    existingFiles.delete(uri);
  });
  jest.doMock('expo-file-system/legacy', () => ({
    documentDirectory: 'file:///docs/',
    cacheDirectory: 'file:///cache/',
    getFreeDiskStorageAsync: async () => 10 * 1024 * 1024 * 1024,
    getInfoAsync: async (uri: string) =>
      existingFiles.has(uri)
        ? { exists: true, size: existingFiles.get(uri), uri }
        : { exists: false },
    deleteAsync,
  }));
  return { deleteAsync };
}

function mockKeepAwake() {
  const activateKeepAwake = jest.fn();
  const deactivateKeepAwake = jest.fn();
  jest.doMock('expo-keep-awake', () => ({ activateKeepAwake, deactivateKeepAwake }));
  return { activateKeepAwake, deactivateKeepAwake };
}

function mockFetcher() {
  const fetch = jest.fn(async () => []);
  // virtual: le package n'expose que la condition "import" dans son exports,
  // que le resolver Jest (condition "require") ne sait pas résoudre.
  jest.doMock(
    'react-native-executorch-expo-resource-fetcher',
    () => ({ ExpoResourceFetcher: { fetch } }),
    { virtual: true }
  );
  return { fetch };
}

describe('mealPhotoCapability', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
    jest.dontMock('expo-device');
    jest.dontMock('expo-file-system/legacy');
    jest.dontMock('expo-keep-awake');
    jest.dontMock('react-native-executorch');
  });

  it('désactive la feature sous Jest (Platform.OS !== android) sans charger executorch', async () => {
    const executorchLoader = jest.fn();
    jest.doMock('react-native-executorch', () => {
      executorchLoader();
      throw new Error('ne doit jamais être chargé');
    });

    const service = loadService();
    await expect(service.canUseMealPhoto()).resolves.toEqual({
      ok: false,
      reason: 'android-version',
    });
    await expect(service.initMealPhotoRuntime()).resolves.toBeUndefined();
    expect(executorchLoader).not.toHaveBeenCalled();
  });

  it('isMealPhotoModelDownloaded retourne false sous Jest (modules natifs absents)', async () => {
    const service = loadService();
    await expect(service.isMealPhotoModelDownloaded()).resolves.toBe(false);
  });

  it('isMealPhotoModelDownloaded : true seulement si tous les fichiers existent, non vides', async () => {
    const existing = new Map<string, number>([
      [MODEL_FINAL_URI, 1_000_000],
      [TOKENIZER_FINAL_URI, 500],
      [CONFIG_FINAL_URI, 200],
    ]);
    mockAndroidDevice(existing);
    const service = loadService();
    await expect(service.isMealPhotoModelDownloaded()).resolves.toBe(true);
  });

  it('isMealPhotoModelDownloaded : false si un fichier est vide (taille 0)', async () => {
    const existing = new Map<string, number>([
      [MODEL_FINAL_URI, 1_000_000],
      [TOKENIZER_FINAL_URI, 0],
      [CONFIG_FINAL_URI, 200],
    ]);
    mockAndroidDevice(existing);
    const service = loadService();
    await expect(service.isMealPhotoModelDownloaded()).resolves.toBe(false);
  });

  it('isMealPhotoModelDownloaded : false si un fichier est absent', async () => {
    const existing = new Map<string, number>([[MODEL_FINAL_URI, 1_000_000]]);
    mockAndroidDevice(existing);
    const service = loadService();
    await expect(service.isMealPhotoModelDownloaded()).resolves.toBe(false);
  });

  it('downloadMealPhotoModel ne relance rien si le modèle est déjà complet', async () => {
    const existing = new Map<string, number>([
      [MODEL_FINAL_URI, 1_000_000],
      [TOKENIZER_FINAL_URI, 500],
      [CONFIG_FINAL_URI, 200],
    ]);
    mockAndroidDevice(existing);
    const keepAwake = mockKeepAwake();
    const fetcher = mockFetcher();

    const service = loadService();
    await expect(service.downloadMealPhotoModel()).resolves.toBe(true);
    expect(fetcher.fetch).not.toHaveBeenCalled();
    expect(keepAwake.activateKeepAwake).not.toHaveBeenCalled();
  });

  it('downloadMealPhotoModel : keep-awake pendant le fetch, vérif taille après succès', async () => {
    const existing = new Map<string, number>();
    mockAndroidDevice(existing);
    const keepAwake = mockKeepAwake();
    const fetcher = mockFetcher();
    fetcher.fetch.mockImplementation(async () => {
      // Le fetcher déplace les fichiers vers le répertoire final en cas de succès.
      existing.set(MODEL_FINAL_URI, 1_000_000);
      existing.set(TOKENIZER_FINAL_URI, 500);
      existing.set(CONFIG_FINAL_URI, 200);
      return [];
    });

    const service = loadService();
    await expect(service.downloadMealPhotoModel()).resolves.toBe(true);
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
    expect(keepAwake.activateKeepAwake).toHaveBeenCalledWith('meal-photo-download');
    expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledWith('meal-photo-download');
    // keep-awake actif AVANT le fetch, relâché APRÈS.
    expect(keepAwake.activateKeepAwake.mock.invocationCallOrder[0]).toBeLessThan(
      fetcher.fetch.mock.invocationCallOrder[0]
    );
    expect(keepAwake.deactivateKeepAwake.mock.invocationCallOrder[0]).toBeGreaterThan(
      fetcher.fetch.mock.invocationCallOrder[0]
    );
  });

  it('downloadMealPhotoModel : supprime les partiels du cache avant de télécharger', async () => {
    const existing = new Map<string, number>([
      // Partiel laissé par une tentative interrompue (jamais déplacé).
      [MODEL_CACHE_URI, 123_456],
    ]);
    const { deleteAsync } = mockAndroidDevice(existing);
    mockKeepAwake();
    const fetcher = mockFetcher();
    fetcher.fetch.mockImplementation(async () => {
      existing.set(MODEL_FINAL_URI, 1_000_000);
      existing.set(TOKENIZER_FINAL_URI, 500);
      existing.set(CONFIG_FINAL_URI, 200);
      return [];
    });

    const service = loadService();
    await expect(service.downloadMealPhotoModel()).resolves.toBe(true);
    expect(deleteAsync).toHaveBeenCalledWith(MODEL_CACHE_URI);
    expect(existing.has(MODEL_CACHE_URI)).toBe(false);
  });

  it('downloadMealPhotoModel : échec → false, keep-awake relâché, partiels nettoyés', async () => {
    const existing = new Map<string, number>([[MODEL_CACHE_URI, 123_456]]);
    const { deleteAsync } = mockAndroidDevice(existing);
    const keepAwake = mockKeepAwake();
    const fetcher = mockFetcher();
    fetcher.fetch.mockRejectedValue(new Error('réseau coupé'));

    const service = loadService();
    await expect(service.downloadMealPhotoModel()).resolves.toBe(false);
    expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledWith('meal-photo-download');
    expect(deleteAsync).toHaveBeenCalledWith(MODEL_CACHE_URI);
  });

  it('downloadMealPhotoModel : false si la vérif post-téléchargement échoue', async () => {
    // fetch « réussit » mais les fichiers finaux sont absents/vides.
    const existing = new Map<string, number>();
    mockAndroidDevice(existing);
    mockKeepAwake();
    mockFetcher();

    const service = loadService();
    await expect(service.downloadMealPhotoModel()).resolves.toBe(false);
  });
});
