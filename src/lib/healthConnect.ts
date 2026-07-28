/**
 * Wrapper défensif autour de react-native-health-connect (Android uniquement).
 *
 * Le module natif est absent sous Jest et Expo Go : la librairie expose alors
 * un proxy qui lève une erreur à chaque appel. Toutes les fonctions de ce
 * module interceptent ces erreurs et dégradent proprement (null / false),
 * sans jamais faire planter l'import.
 */

type HealthConnectModule = typeof import('react-native-health-connect');
type HealthPermission = import('react-native-health-connect').Permission;

const REQUIRED_PERMISSIONS: HealthPermission[] = [
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'Steps' },
];

export interface CaloriesBurnedToday {
  /** Calories actives (Activité) brûlées aujourd'hui, en kcal. */
  active: number;
  /** Calories totales (métabolisme + activité) brûlées aujourd'hui, en kcal. */
  total: number;
}

function loadModule(): HealthConnectModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health-connect') as HealthConnectModule;
  } catch {
    return null;
  }
}

async function safeCall<T>(fn: (hc: HealthConnectModule) => Promise<T>): Promise<T | null> {
  const hc = loadModule();
  if (!hc) return null;
  try {
    return await fn(hc);
  } catch {
    return null;
  }
}

/** true si Health Connect est installé et utilisable sur l'appareil. */
export async function isHealthConnectAvailable(): Promise<boolean> {
  const hc = loadModule();
  if (!hc) return false;
  const status = await safeCall((module) => module.getSdkStatus());
  return status !== null && status === hc.SdkAvailabilityStatus.SDK_AVAILABLE;
}

/** Initialise le client Health Connect. false si indisponible. */
export async function initializeHealthConnect(): Promise<boolean> {
  const result = await safeCall((hc) => hc.initialize());
  return result === true;
}

function hasAllReadPermissions(granted: HealthPermission[] | null): boolean {
  if (!granted) return false;
  return REQUIRED_PERMISSIONS.every((required) =>
    granted.some(
      (permission) =>
        permission.accessType === required.accessType &&
        permission.recordType === required.recordType
    )
  );
}

/** true si les permissions de lecture calories/pas sont déjà accordées. */
export async function hasHealthPermissions(): Promise<boolean> {
  const granted = await safeCall(
    (hc) => hc.getGrantedPermissions() as Promise<HealthPermission[]>
  );
  return hasAllReadPermissions(granted);
}

/**
 * Lance le flow de permission Health Connect.
 * true si toutes les permissions requises ont été accordées.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  const granted = await safeCall(
    (hc) => hc.requestPermission([...REQUIRED_PERMISSIONS]) as Promise<HealthPermission[]>
  );
  return hasAllReadPermissions(granted);
}

function todayTimeRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return {
    timeRangeFilter: {
      operator: 'between' as const,
      startTime: start.toISOString(),
      endTime: new Date().toISOString(),
    },
  };
}

/** Calories brûlées aujourd'hui (actives + totales), en kcal. null si indisponible. */
export async function readCaloriesBurnedToday(): Promise<CaloriesBurnedToday | null> {
  return safeCall(async (hc) => {
    const range = todayTimeRange();
    const [activeResult, totalResult] = await Promise.all([
      hc.readRecords('ActiveCaloriesBurned', range),
      hc.readRecords('TotalCaloriesBurned', range),
    ]);
    const active = activeResult.records.reduce(
      (sum, record) => sum + record.energy.inKilocalories,
      0
    );
    const total = totalResult.records.reduce(
      (sum, record) => sum + record.energy.inKilocalories,
      0
    );
    return { active: Math.round(active), total: Math.round(total) };
  });
}

/** Nombre de pas effectués aujourd'hui. null si indisponible. */
export async function readStepsToday(): Promise<number | null> {
  return safeCall(async (hc) => {
    const result = await hc.readRecords('Steps', todayTimeRange());
    return result.records.reduce((sum, record) => sum + record.count, 0);
  });
}
