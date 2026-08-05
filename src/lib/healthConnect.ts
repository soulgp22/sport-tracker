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

/**
 * Statut détaillé de Health Connect sur l'appareil :
 * - 'available' : installé et utilisable ;
 * - 'not-installed' : SDK absent — l'app Health Connect n'est pas installée
 *   (ou l'appareil ne la supporte pas) ;
 * - 'needs-update' : installée mais obsolète, mise à jour requise ;
 * - 'unavailable' : module natif absent (Jest, Expo Go, iOS) ou erreur.
 */
export type HealthConnectStatus = 'available' | 'not-installed' | 'needs-update' | 'unavailable';

/** Statut détaillé de Health Connect (appel frais, utile juste après une installation). */
export async function getHealthConnectStatus(): Promise<HealthConnectStatus> {
  const hc = loadModule();
  if (!hc) return 'unavailable';
  const status = await safeCall((module) => module.getSdkStatus());
  if (status === null) return 'unavailable';
  if (status === hc.SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
  if (status === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
    return 'needs-update';
  }
  return 'not-installed';
}

/** true si Health Connect est installé et utilisable sur l'appareil. */
export async function isHealthConnectAvailable(): Promise<boolean> {
  return (await getHealthConnectStatus()) === 'available';
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

/** Résultat détaillé du flow de permission Health Connect. */
export interface HealthPermissionResult {
  /** Statut Health Connect mesuré juste avant la demande (post-installation). */
  status: HealthConnectStatus;
  /** true si toutes les permissions requises ont été accordées. */
  granted: boolean;
  /** Refus instantané sans feuille affichée = appli hors Play Store bloquée par HC. */
  instantDenial?: boolean;
  /** Message d'erreur natif si requestPermission a levé une exception. */
  error?: string;
}

/**
 * Lance le flow de permission Health Connect avec un résultat détaillé.
 * Vérifie d'abord le statut SDK (un utilisateur peut venir d'installer
 * l'app Health Connect) : si le SDK n'est pas disponible, la demande n'est
 * pas tentée et le statut explique pourquoi.
 */
export async function requestHealthPermissionsWithStatus(): Promise<HealthPermissionResult> {
  const hc = loadModule();
  if (!hc) return { status: 'unavailable', granted: false };
  const status = await getHealthConnectStatus();
  if (status !== 'available') return { status, granted: false };
  try {
    // Obligatoire avant requestPermission : sinon « client is not initialized ».
    await hc.initialize();
    const startedAt = Date.now();
    const granted = (await hc.requestPermission([...REQUIRED_PERMISSIONS])) as HealthPermission[];
    // Refus résolu quasi instantanément = la feuille de permission ne s'est
    // JAMAIS affichée : signature du blocage des applis installées hors Play
    // Store (Health Connect les ignore, elles n'apparaissent pas dans sa liste).
    const instantDenial = granted.length === 0 && Date.now() - startedAt < 400;
    return { status, granted: hasAllReadPermissions(granted), instantDenial };
  } catch (error) {
    return {
      status,
      granted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Lance le flow de permission Health Connect.
 * true si toutes les permissions requises ont été accordées.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  return (await requestHealthPermissionsWithStatus()).granted;
}

/** Ouvre les réglages Health Connect (réactivation des permissions). No-op si indisponible. */
export function openHealthConnectSettingsSafe(): boolean {
  const hc = loadModule();
  if (!hc) return false;
  try {
    hc.openHealthConnectSettings();
    return true;
  } catch {
    return false;
  }
}

/**
 * Ouvre DIRECTEMENT la page de permissions Health Connect de NOTRE app.
 * Nécessaire car l'app n'apparaît pas toujours dans la liste HC (notamment
 * installée hors Play Store) : l'intent MANAGE_HEALTH_PERMISSIONS avec le
 * package en extra ouvre la bonne page même si l'app est absente de la liste.
 * Retourne true si un écran a été ouvert (deep-link ou réglages HC).
 */
export async function openHealthConnectPermissionsForApp(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IntentLauncher = require('expo-intent-launcher') as typeof import('expo-intent-launcher');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { applicationId } = require('expo-application') as typeof import('expo-application');
    await IntentLauncher.startActivityAsync(
      'android.health.connect.action.MANAGE_HEALTH_PERMISSIONS',
      {
        extra: applicationId
          ? { 'android.intent.extra.PACKAGE_NAME': applicationId }
          : undefined,
      }
    );
    return true;
  } catch {
    // Repli : la page d'accueil des réglages Health Connect.
    return openHealthConnectSettingsSafe();
  }
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
    await hc.initialize();
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
    await hc.initialize();
    const result = await hc.readRecords('Steps', todayTimeRange());
    return result.records.reduce((sum, record) => sum + record.count, 0);
  });
}
