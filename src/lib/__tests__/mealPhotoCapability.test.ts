/**
 * Tests du gating mealPhoto : sous Jest (plateforme non Android), la feature
 * doit être désactivée et le module executorch ne doit JAMAIS être chargé.
 */

type CapabilityService = typeof import('../mealPhotoCapability');

function loadService(): CapabilityService {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../mealPhotoCapability') as CapabilityService;
}

describe('mealPhotoCapability', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('expo-device');
    jest.dontMock('expo-file-system/legacy');
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
});
