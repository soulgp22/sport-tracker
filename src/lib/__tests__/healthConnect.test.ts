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
  let warnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.resetModules();
    jest.dontMock('react-native-health-connect');
  });

  it('dégrade proprement quand le module natif est absent (vrai module, plateforme non Android)', async () => {
    const service = loadService();
    await expect(service.isHealthConnectAvailable()).resolves.toBe(false);
    await expect(service.hasHealthPermissions()).resolves.toBe(false);
    await expect(service.readCaloriesBurnedToday()).resolves.toBeNull();
    await expect(service.readStepsToday()).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('[healthConnect] getSdkStatus', expect.any(Error));
    expect(warnSpy).toHaveBeenCalledWith(
      '[healthConnect] getGrantedPermissions',
      expect.any(Error)
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[healthConnect] readCaloriesBurnedToday',
      expect.any(Error)
    );
    expect(warnSpy).toHaveBeenCalledWith('[healthConnect] readStepsToday', expect.any(Error));
  });

  it('dégrade proprement quand le require du module échoue', async () => {
    jest.doMock('react-native-health-connect', () => {
      throw new Error('Native module not linked');
    });
    const service = loadService();
    await expect(service.isHealthConnectAvailable()).resolves.toBe(false);
    await expect(service.hasHealthPermissions()).resolves.toBe(false);
    await expect(service.readCaloriesBurnedToday()).resolves.toBeNull();
    await expect(service.readStepsToday()).resolves.toBeNull();
  });

  it('retourne false/null quand les appels natifs rejettent', async () => {
    jest.doMock('react-native-health-connect', () => ({
      SdkAvailabilityStatus: { SDK_AVAILABLE: 3 },
      getSdkStatus: jest.fn().mockRejectedValue(new Error('boom')),
      initialize: jest.fn().mockRejectedValue(new Error('boom')),
      getGrantedPermissions: jest.fn().mockRejectedValue(new Error('boom')),
      readRecords: jest.fn().mockRejectedValue(new Error('boom')),
    }));
    const service = loadService();
    await expect(service.isHealthConnectAvailable()).resolves.toBe(false);
    await expect(service.hasHealthPermissions()).resolves.toBe(false);
    await expect(service.readCaloriesBurnedToday()).resolves.toBeNull();
    await expect(service.readStepsToday()).resolves.toBeNull();
  });

  it('lit les calories quand le module répond', async () => {
    jest.doMock('react-native-health-connect', () => ({
      SdkAvailabilityStatus: { SDK_AVAILABLE: 3 },
      getSdkStatus: jest.fn().mockResolvedValue(3),
      initialize: jest.fn().mockResolvedValue(true),
      getGrantedPermissions: jest.fn().mockResolvedValue(ALL_GRANTED),
      readRecords: jest.fn((recordType: string) => {
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
    await expect(service.hasHealthPermissions()).resolves.toBe(true);
    await expect(service.readCaloriesBurnedToday()).resolves.toEqual({
      active: 300,
      total: 2201,
    });
  });

  it('lit et additionne les pas du jour sur la plage locale utilisee pour les calories', async () => {
    const readRecords = jest.fn().mockResolvedValue({
      records: [{ count: 4200 }, { count: 800 }],
    });
    jest.doMock('react-native-health-connect', () => ({
      initialize: jest.fn().mockResolvedValue(true),
      readRecords,
    }));
    const service = loadService();

    await expect(service.readStepsToday()).resolves.toBe(5000);
    expect(readRecords).toHaveBeenCalledTimes(1);
    expect(readRecords).toHaveBeenCalledWith('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: expect.any(String),
        endTime: expect.any(String),
      },
    });
    const [, options] = readRecords.mock.calls[0];
    const start = new Date(options.timeRangeFilter.startTime);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });

  it('signale indisponible quand le SDK ne rapporte pas SDK_AVAILABLE', async () => {
    jest.doMock('react-native-health-connect', () => ({
      SdkAvailabilityStatus: { SDK_AVAILABLE: 3 },
      getSdkStatus: jest.fn().mockResolvedValue(1),
    }));
    const service = loadService();
    await expect(service.isHealthConnectAvailable()).resolves.toBe(false);
  });

  it('hasHealthPermissions retourne false si les permissions sont partielles', async () => {
    jest.doMock('react-native-health-connect', () => ({
      initialize: jest.fn().mockResolvedValue(true),
      getGrantedPermissions: jest
        .fn()
        .mockResolvedValue([{ accessType: 'read', recordType: 'Steps' }]),
    }));
    const service = loadService();
    await expect(service.hasHealthPermissions()).resolves.toBe(false);
  });

  it('initialise le client avant de lire les permissions déjà accordées', async () => {
    let initialized = false;
    const initialize = jest.fn(async () => {
      initialized = true;
      return true;
    });
    const getGrantedPermissions = jest.fn(async () => {
      if (!initialized) throw new Error('client is not initialized');
      return ALL_GRANTED;
    });
    jest.doMock('react-native-health-connect', () => ({
      initialize,
      getGrantedPermissions,
    }));

    const service = loadService();
    await expect(service.hasHealthPermissions()).resolves.toBe(true);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(getGrantedPermissions).toHaveBeenCalledTimes(1);
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

describe('healthConnect — poids (permission optionnelle)', () => {
  let warnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.resetModules();
    jest.dontMock('react-native-health-connect');
  });

  /**
   * Regression : le poids est arrive apres les pas et les calories. S'il
   * rejoignait le groupe des permissions REQUISES, tous les utilisateurs deja
   * autorises basculeraient en « permission requise » et perdraient
   * l'affichage des pas jusqu'a une nouvelle autorisation.
   */
  it('ne degrade PAS les permissions requises quand le poids est refuse', async () => {
    jest.doMock('react-native-health-connect', () => ({
      initialize: jest.fn().mockResolvedValue(true),
      getGrantedPermissions: jest.fn().mockResolvedValue([
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'TotalCaloriesBurned' },
        { accessType: 'read', recordType: 'Steps' },
      ]),
    }));
    const service = loadService();

    await expect(service.hasHealthPermissions()).resolves.toBe(true);
    await expect(service.hasWeightPermission()).resolves.toBe(false);
  });

  it('reconnait la permission poids quand elle est accordee', async () => {
    jest.doMock('react-native-health-connect', () => ({
      initialize: jest.fn().mockResolvedValue(true),
      getGrantedPermissions: jest
        .fn()
        .mockResolvedValue([{ accessType: 'read', recordType: 'Weight' }]),
    }));
    const service = loadService();

    await expect(service.hasWeightPermission()).resolves.toBe(true);
  });

  it('demande poids et permissions requises dans la meme feuille', async () => {
    const requestPermission = jest.fn().mockResolvedValue([]);
    jest.doMock('react-native-health-connect', () => ({
      SdkAvailabilityStatus: { SDK_AVAILABLE: 3 },
      getSdkStatus: jest.fn().mockResolvedValue(3),
      initialize: jest.fn().mockResolvedValue(true),
      requestPermission,
    }));
    const service = loadService();

    await service.requestHealthPermissionsWithStatus();

    expect(requestPermission).toHaveBeenCalledWith(
      expect.arrayContaining([{ accessType: 'read', recordType: 'Weight' }])
    );
    expect(requestPermission.mock.calls[0][0]).toHaveLength(4);
  });

  it('retient le releve le plus recent, quel que soit l ordre rendu', async () => {
    const readRecords = jest.fn().mockResolvedValue({
      records: [
        { time: '2026-08-20T09:00:00.000Z', weight: { inKilograms: 80.2 } },
        { time: '2026-08-27T07:12:00.000Z', weight: { inKilograms: 78.44 } },
        { time: '2026-08-25T08:00:00.000Z', weight: { inKilograms: 79.1 } },
      ],
    });
    jest.doMock('react-native-health-connect', () => ({
      initialize: jest.fn().mockResolvedValue(true),
      readRecords,
    }));
    const service = loadService();

    await expect(service.readLatestWeight()).resolves.toEqual({
      weightKg: 78.4,
      time: '2026-08-27T07:12:00.000Z',
    });

    // La fenetre de lecture n'est PAS celle du jour : on ne se pese pas
    // tous les jours, il faut remonter 90 jours en arriere.
    const [recordType, options] = readRecords.mock.calls[0];
    expect(recordType).toBe('Weight');
    const start = new Date(options.timeRangeFilter.startTime);
    const end = new Date(options.timeRangeFilter.endTime);
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    expect(days).toBe(90);
  });

  it('retourne null quand aucun poids n a ete enregistre', async () => {
    jest.doMock('react-native-health-connect', () => ({
      initialize: jest.fn().mockResolvedValue(true),
      readRecords: jest.fn().mockResolvedValue({ records: [] }),
    }));
    const service = loadService();

    await expect(service.readLatestWeight()).resolves.toBeNull();
  });

  it('degrade proprement quand le module natif est absent', async () => {
    const service = loadService();
    await expect(service.hasWeightPermission()).resolves.toBe(false);
    await expect(service.readLatestWeight()).resolves.toBeNull();
  });
});
