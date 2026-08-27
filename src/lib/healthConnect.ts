/**
 * Wrapper défensif autour de react-native-health-connect (Android uniquement).
 *
 * Le module natif est absent sous Jest et Expo Go : la librairie expose alors
 * un proxy qui lève une erreur à chaque appel. Toutes les fonctions de ce
 * module interceptent ces erreurs et dégradent proprement (null / false),
 * sans jamais faire planter l'import.
 */

import type { HealthWeightSample } from './healthWeightMerge';

export type { HealthWeightSample };

type HealthConnectModule = typeof import('react-native-health-connect');
type HealthPermission = import('react-native-health-connect').Permission;

const REQUIRED_PERMISSIONS: HealthPermission[] = [
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'Steps' },
];

/**
 * Permissions demandees EN PLUS des requises, mais dont l'absence ne doit
 * JAMAIS degrader l'app.
 *
 * Le poids est arrive apres les pas et les calories. L'ajouter a
 * `REQUIRED_PERMISSIONS` aurait fait basculer tous les utilisateurs deja
 * autorises en « permission requise » — `hasAllReadPermissions` exige TOUTES
 * les permissions du groupe — et leur aurait fait perdre l'affichage des pas
 * jusqu'a une nouvelle autorisation. Un ajout de fonctionnalite ne casse pas
 * ce qui marchait : deux groupes, deux verifications.
 *
 * ---
 *
 * VIDE POUR L'INSTANT. `android.permission.health.READ_WEIGHT` fait basculer
 * l'application dans la categorie « applications de sante » cote Google Play,
 * qui refuse alors TOUT televersement — meme sur le track interne — tant que
 * la « Declaration relative aux applications de sante » n'est pas remplie
 * (« You must let us know whether your app includes any health features. »,
 * 2026-08-27).
 *
 * On ne demande PAS une permission absente du manifeste : Health Connect peut
 * rejeter la feuille entiere, ce qui ferait perdre les pas et les calories qui
 * fonctionnent aujourd'hui. Le retrait est donc fait aux trois endroits a la
 * fois.
 *
 * POUR REACTIVER LE POIDS, apres validation de la declaration :
 *   1. remettre `{ accessType: 'read', recordType: 'Weight' }` ci-dessous ;
 *   2. remettre `android.permission.health.READ_WEIGHT` dans `app.json` ;
 *   3. remettre la meme ligne dans `android/app/src/main/AndroidManifest.xml`
 *      (genere et gitignore : `app.json` seul ne suffit pas).
 * Tout le reste de la chaine de lecture est deja en place et testee.
 */
const OPTIONAL_PERMISSIONS: HealthPermission[] = [];

/**
 * Fenetre de recherche du dernier poids connu, en jours.
 *
 * Les pas et les calories se lisent « aujourd'hui » ; le poids non — on ne se
 * pese pas tous les jours. On remonte donc sur 90 jours et on garde le releve
 * le plus recent. Au-dela, une valeur serait trop vieille pour representer le
 * poids actuel.
 */
const WEIGHT_LOOKBACK_DAYS = 90;

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

let initializationPromise: Promise<boolean> | null = null;

function ensureInitialized(hc: HealthConnectModule): Promise<boolean> {
  if (!initializationPromise) {
    initializationPromise = hc.initialize().catch((error: unknown) => {
      initializationPromise = null;
      throw error;
    });
  }
  return initializationPromise;
}

function warnInDev(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[healthConnect] ${context}`, error);
  }
}

async function safeCall<T>(
  context: string,
  fn: (hc: HealthConnectModule) => Promise<T>
): Promise<T | null> {
  const hc = loadModule();
  if (!hc) return null;
  try {
    return await fn(hc);
  } catch (error) {
    warnInDev(context, error);
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
  const status = await safeCall('getSdkStatus', (module) => module.getSdkStatus());
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
    'getGrantedPermissions',
    async (hc) => {
      await ensureInitialized(hc);
      return hc.getGrantedPermissions() as Promise<HealthPermission[]>;
    }
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
    await ensureInitialized(hc);
    const startedAt = Date.now();
    // Les deux groupes sont demandes ensemble : une seule feuille pour
    // l'utilisateur. Seules les requises conditionnent `granted`.
    const granted = (await hc.requestPermission([
      ...REQUIRED_PERMISSIONS,
      ...OPTIONAL_PERMISSIONS,
    ])) as HealthPermission[];
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
  return safeCall('readCaloriesBurnedToday', async (hc) => {
    await ensureInitialized(hc);
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

/** Nombre de pas effectues aujourd'hui. null si indisponible. */
export async function readStepsToday(): Promise<number | null> {
  return safeCall('readStepsToday', async (hc) => {
    await ensureInitialized(hc);
    const result = await hc.readRecords('Steps', todayTimeRange());
    return result.records.reduce((sum, record) => sum + record.count, 0);
  });
}

/** true si la lecture du poids est autorisee (permission optionnelle). */
export async function hasWeightPermission(): Promise<boolean> {
  // Sans ce garde, `[].every(...)` vaut true : la fonction repondrait « oui,
  // autorise » alors que la permission n'est meme pas declaree, et l'app
  // tenterait une lecture vouee a l'echec a chaque affichage.
  if (OPTIONAL_PERMISSIONS.length === 0) return false;

  const granted = await safeCall('getGrantedPermissions', async (hc) => {
    await ensureInitialized(hc);
    return hc.getGrantedPermissions() as Promise<HealthPermission[]>;
  });
  if (!granted) return false;
  return OPTIONAL_PERMISSIONS.every((required) =>
    granted.some(
      (permission) =>
        permission.accessType === required.accessType &&
        permission.recordType === required.recordType
    )
  );
}

/**
 * Dernier poids enregistre dans Health Connect sur les 90 derniers jours.
 * null si indisponible, non autorise, ou si aucun releve n'existe.
 */
export async function readLatestWeight(): Promise<HealthWeightSample | null> {
  return safeCall('readLatestWeight', async (hc) => {
    await ensureInitialized(hc);
    const start = new Date();
    start.setDate(start.getDate() - WEIGHT_LOOKBACK_DAYS);
    const result = await hc.readRecords('Weight', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: new Date().toISOString(),
      },
    });
    if (result.records.length === 0) return null;
    // Health Connect ne garantit pas l'ordre : on prend le plus recent.
    const latest = result.records.reduce((newest, record) =>
      record.time > newest.time ? record : newest
    );
    const weightKg = Math.round(latest.weight.inKilograms * 10) / 10;
    if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
    return { weightKg, time: latest.time };
  });
}
