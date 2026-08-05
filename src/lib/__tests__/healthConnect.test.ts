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

  describe('getHealthConnectStatus', () => {
    const SDK = {
      SDK_UNAVAILABLE: 1,
      SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
      SDK_AVAILABLE: 3,
    };

    it("retourne 'unavailable' quand le module natif est absent", async () => {
      const service = loadService();
      await expect(service.getHealthConnectStatus()).resolves.toBe('unavailable');
    });

    it("retourne 'available' quand le SDK rapporte SDK_AVAILABLE", async () => {
      jest.doMock('react-native-health-connect', () => ({
        SdkAvailabilityStatus: SDK,
        getSdkStatus: jest.fn().mockResolvedValue(3),
        initialize: jest.fn().mockResolvedValue(true),
      }));
      const service = loadService();
      await expect(service.getHealthConnectStatus()).resolves.toBe('available');
    });

    it("retourne 'not-installed' quand le SDK rapporte SDK_UNAVAILABLE", async () => {
      jest.doMock('react-native-health-connect', () => ({
        SdkAvailabilityStatus: SDK,
        getSdkStatus: jest.fn().mockResolvedValue(1),
      }));
      const service = loadService();
      await expect(service.getHealthConnectStatus()).resolves.toBe('not-installed');
    });

    it("retourne 'needs-update' quand une mise à jour du provider est requise", async () => {
      jest.doMock('react-native-health-connect', () => ({
        SdkAvailabilityStatus: SDK,
        getSdkStatus: jest.fn().mockResolvedValue(2),
      }));
      const service = loadService();
      await expect(service.getHealthConnectStatus()).resolves.toBe('needs-update');
    });

    it("retourne 'unavailable' quand getSdkStatus rejette", async () => {
      jest.doMock('react-native-health-connect', () => ({
        SdkAvailabilityStatus: SDK,
        getSdkStatus: jest.fn().mockRejectedValue(new Error('boom')),
      }));
      const service = loadService();
      await expect(service.getHealthConnectStatus()).resolves.toBe('unavailable');
    });
  });

  describe('requestHealthPermissionsWithStatus', () => {
    const SDK = {
      SDK_UNAVAILABLE: 1,
      SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
      SDK_AVAILABLE: 3,
    };

    it('ne tente pas requestPermission si Health Connect n’est pas installé', async () => {
      const requestPermission = jest.fn();
      jest.doMock('react-native-health-connect', () => ({
        SdkAvailabilityStatus: SDK,
        getSdkStatus: jest.fn().mockResolvedValue(1),
        requestPermission,
      }));
      const service = loadService();
      await expect(service.requestHealthPermissionsWithStatus()).resolves.toEqual({
        status: 'not-installed',
        granted: false,
      });
      expect(requestPermission).not.toHaveBeenCalled();
    });

    it('remonte needs-update sans tenter requestPermission', async () => {
      jest.doMock('react-native-health-connect', () => ({
        SdkAvailabilityStatus: SDK,
        getSdkStatus: jest.fn().mockResolvedValue(2),
        requestPermission: jest.fn(),
      }));
      const service = loadService();
      await expect(service.requestHealthPermissionsWithStatus()).resolves.toEqual({
        status: 'needs-update',
        granted: false,
      });
    });

    it('retourne granted true quand toutes les permissions sont accordées', async () => {
      jest.doMock('react-native-health-connect', () => ({
        SdkAvailabilityStatus: SDK,
        getSdkStatus: jest.fn().mockResolvedValue(3),
        initialize: jest.fn().mockResolvedValue(true),
        requestPermission: jest.fn().mockResolvedValue(ALL_GRANTED),
      }));
      const service = loadService();
      await expect(service.requestHealthPermissionsWithStatus()).resolves.toEqual({
        status: 'available',
        granted: true,
        instantDenial: false,
      });
    });

    it('retourne granted false (sans erreur) quand les permissions sont refusées', async () => {
      jest.doMock('react-native-health-connect', () => ({
        SdkAvailabilityStatus: SDK,
        getSdkStatus: jest.fn().mockResolvedValue(3),
        initialize: jest.fn().mockResolvedValue(true),
        requestPermission: jest.fn().mockResolvedValue([]),
      }));
      const service = loadService();
      await expect(service.requestHealthPermissionsWithStatus()).resolves.toEqual({
        status: 'available',
        granted: false,
        instantDenial: true,
      });
    });

    it("capture le message d'erreur quand requestPermission rejette", async () => {
      jest.doMock('react-native-health-connect', () => ({
        SdkAvailabilityStatus: SDK,
        getSdkStatus: jest.fn().mockResolvedValue(3),
        initialize: jest.fn().mockResolvedValue(true),
        requestPermission: jest.fn().mockRejectedValue(new Error('activity not found')),
      }));
      const service = loadService();
      await expect(service.requestHealthPermissionsWithStatus()).resolves.toEqual({
        status: 'available',
        granted: false,
        error: 'activity not found',
      });
    });
  });

  describe('openHealthConnectSettingsSafe', () => {
    it('retourne false quand le module natif est absent', () => {
      const service = loadService();
      expect(service.openHealthConnectSettingsSafe()).toBe(false);
    });

    it('ouvre les réglages quand le module répond', () => {
      const openHealthConnectSettings = jest.fn();
      jest.doMock('react-native-health-connect', () => ({ openHealthConnectSettings }));
      const service = loadService();
      expect(service.openHealthConnectSettingsSafe()).toBe(true);
      expect(openHealthConnectSettings).toHaveBeenCalledTimes(1);
    });

    it('retourne false si l’ouverture échoue', () => {
      jest.doMock('react-native-health-connect', () => ({
        openHealthConnectSettings: jest.fn(() => {
          throw new Error('no activity');
        }),
      }));
      const service = loadService();
      expect(service.openHealthConnectSettingsSafe()).toBe(false);
    });
  });
});
