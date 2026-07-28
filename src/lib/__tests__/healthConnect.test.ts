/**
 * Tests du wrapper défensif healthConnect : le module natif est absent sous
 * Jest, toutes les fonctions doivent dégrader proprement (null / false).
 */

type HealthConnectService = typeof import('../healthConnect');

const ALL_GRANTED = [
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'Steps' },
];

function loadService(): HealthConnectService {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../healthConnect') as HealthConnectService;
}

describe('healthConnect', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native-health-connect');
  });

  it('dégrade proprement quand le module natif est absent (vrai module, plateforme non Android)', async () => {
    const service = loadService();
    await expect(service.isHealthConnectAvailable()).resolves.toBe(false);
    await expect(service.initializeHealthConnect()).resolves.toBe(false);
    await expect(service.hasHealthPermissions()).resolves.toBe(false);
    await expect(service.requestHealthPermissions()).resolves.toBe(false);
    await expect(service.readCaloriesBurnedToday()).resolves.toBeNull();
    await expect(service.readStepsToday()).resolves.toBeNull();
  });

  it('dégrade proprement quand le require du module échoue', async () => {
    jest.doMock('react-native-health-connect', () => {
      throw new Error('Native module not linked');
    });
    const service = loadService();
    await expect(service.isHealthConnectAvailable()).resolves.toBe(false);
    await expect(service.initializeHealthConnect()).resolves.toBe(false);
    await expect(service.hasHealthPermissions()).resolves.toBe(false);
    await expect(service.requestHealthPermissions()).resolves.toBe(false);
    await expect(service.readCaloriesBurnedToday()).resolves.toBeNull();
    await expect(service.readStepsToday()).resolves.toBeNull();
  });

  it('retourne false/null quand les appels natifs rejettent', async () => {
    jest.doMock('react-native-health-connect', () => ({
      SdkAvailabilityStatus: { SDK_AVAILABLE: 3 },
      getSdkStatus: jest.fn().mockRejectedValue(new Error('boom')),
      initialize: jest.fn().mockRejectedValue(new Error('boom')),
      getGrantedPermissions: jest.fn().mockRejectedValue(new Error('boom')),
      requestPermission: jest.fn().mockRejectedValue(new Error('boom')),
      readRecords: jest.fn().mockRejectedValue(new Error('boom')),
    }));
    const service = loadService();
    await expect(service.isHealthConnectAvailable()).resolves.toBe(false);
    await expect(service.initializeHealthConnect()).resolves.toBe(false);
    await expect(service.hasHealthPermissions()).resolves.toBe(false);
    await expect(service.requestHealthPermissions()).resolves.toBe(false);
    await expect(service.readCaloriesBurnedToday()).resolves.toBeNull();
    await expect(service.readStepsToday()).resolves.toBeNull();
  });

  it('lit les calories et les pas quand le module répond', async () => {
    jest.doMock('react-native-health-connect', () => ({
      SdkAvailabilityStatus: { SDK_AVAILABLE: 3 },
      getSdkStatus: jest.fn().mockResolvedValue(3),
      initialize: jest.fn().mockResolvedValue(true),
      getGrantedPermissions: jest.fn().mockResolvedValue(ALL_GRANTED),
      requestPermission: jest.fn().mockResolvedValue(ALL_GRANTED),
      readRecords: jest.fn((recordType: string) => {
        if (recordType === 'Steps') {
          return Promise.resolve({ records: [{ count: 100 }, { count: 250 }] });
        }
        if (recordType === 'ActiveCaloriesBurned') {
          return Promise.resolve({ records: [{ energy: { inKilocalories: 300.4 } }] });
        }
        return Promise.resolve({
          records: [
            { energy: { inKilocalories: 2100.6 } },
            { energy: { inKilocalories: 100 } },
          ],
        });
      }),
    }));
    const service = loadService();
    await expect(service.isHealthConnectAvailable()).resolves.toBe(true);
    await expect(service.initializeHealthConnect()).resolves.toBe(true);
    await expect(service.hasHealthPermissions()).resolves.toBe(true);
    await expect(service.requestHealthPermissions()).resolves.toBe(true);
    await expect(service.readCaloriesBurnedToday()).resolves.toEqual({
      active: 300,
      total: 2201,
    });
    await expect(service.readStepsToday()).resolves.toBe(350);
  });

  it('signale indisponible quand le SDK ne rapporte pas SDK_AVAILABLE', async () => {
    jest.doMock('react-native-health-connect', () => ({
      SdkAvailabilityStatus: { SDK_AVAILABLE: 3 },
      getSdkStatus: jest.fn().mockResolvedValue(1),
    }));
    const service = loadService();
    await expect(service.isHealthConnectAvailable()).resolves.toBe(false);
  });

  it('requestHealthPermissions retourne false si les permissions sont partielles', async () => {
    jest.doMock('react-native-health-connect', () => ({
      requestPermission: jest
        .fn()
        .mockResolvedValue([{ accessType: 'read', recordType: 'Steps' }]),
      getGrantedPermissions: jest
        .fn()
        .mockResolvedValue([{ accessType: 'read', recordType: 'Steps' }]),
    }));
    const service = loadService();
    await expect(service.requestHealthPermissions()).resolves.toBe(false);
    await expect(service.hasHealthPermissions()).resolves.toBe(false);
  });
});
