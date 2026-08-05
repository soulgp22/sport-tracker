/**
 * Tests du gating mealPhoto (mode serveur) : sous Jest (plateforme non
 * Android), la feature est désactivée. Plus aucun module natif (llama.rn,
 * expo-device, fs, keep-awake) ne doit être chargé — le modèle vit sur le
 * serveur, pas sur le téléphone.
 */

type CapabilityService = typeof import('../mealPhotoCapability');

function loadService(): CapabilityService {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../mealPhotoCapability') as CapabilityService;
}

function mockAndroid(version: number) {
  jest.doMock('react-native', () => ({ Platform: { OS: 'android', Version: version } }));
}

describe('mealPhotoCapability (mode serveur)', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
  });

  it('désactive la feature sous Jest (Platform.OS !== android)', async () => {
    const service = loadService();
    await expect(service.canUseMealPhoto()).resolves.toEqual({
      ok: false,
      reason: 'android-version',
    });
    await expect(service.downloadMealPhotoModel()).resolves.toBe(false);
    await expect(service.initMealPhotoRuntime()).resolves.toBeUndefined();
  });

  it('active la feature sur Android récent avec serveur configuré', async () => {
    mockAndroid(34);
    const service = loadService();
    await expect(service.canUseMealPhoto()).resolves.toEqual({ ok: true });
  });

  it('refuse un Android trop ancien', async () => {
    mockAndroid(28);
    const service = loadService();
    await expect(service.canUseMealPhoto()).resolves.toEqual({
      ok: false,
      reason: 'android-version',
    });
  });

  it('downloadMealPhotoModel est un no-op instantané (plus rien à télécharger)', async () => {
    mockAndroid(34);
    const service = loadService();
    const onProgress = jest.fn();
    await expect(service.downloadMealPhotoModel(onProgress)).resolves.toBe(true);
    expect(onProgress).toHaveBeenCalledWith(1);
  });

  it('initMealPhotoRuntime reste un no-op', async () => {
    const service = loadService();
    await expect(service.initMealPhotoRuntime()).resolves.toBeUndefined();
  });
});
