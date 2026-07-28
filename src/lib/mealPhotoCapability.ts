/**
 * Gating de la feature « estimation de repas par photo » (VLM on-device).
 *
 * react-native-executorch exige Android API 33+ (arm64), ~4,4 Go de modèle à
 * télécharger (Gemma 4 E2B multimodal, backend Vulkan) et beaucoup de RAM en
 * inférence. La feature n'est donc exposée que sur les appareils capables. Le module executorch n'est JAMAIS importé
 * ici : il est chargé dynamiquement (require dans try/catch, pattern
 * healthConnect) uniquement quand le gating est OK, ce qui le rend inerte
 * sous Jest, Expo Go et les appareils exclus.
 *
 * Persistance des fichiers (diagnostic react-native-executorch-expo-resource-fetcher) :
 * - les fichiers terminés sont écrits dans
 *   `${documentDirectory}react-native-executorch/` (persistant, non purgable) ;
 * - MAIS le téléchargement en cours va dans `${cacheDirectory}` et n'est
 *   déplacé vers le répertoire final qu'en cas de succès HTTP (handleRemote) ;
 * - la décision de re-télécharger ne regarde QUE l'existence du fichier final
 *   (`checkFileExists(fileUri)`) : un téléchargement interrompu (veille,
 *   arrière-plan, kill) laisse un fichier partiel dans le cache, rien dans le
 *   répertoire final → la tentative suivante repart de zéro (pas de reprise
 *   inter-session : createDownloadResumable écrase le partiel).
 * Conséquence : tant que le téléchargement (~4,4 Go) est coupé avant la fin,
 * le modèle « se retélécharge à chaque utilisation ». D'où : keep-awake pendant
 * le téléchargement, vérif existence+taille avant de relancer, et suppression
 * des partiels en échec pour repartir propre.
 */

import { Platform } from 'react-native';

/** Android API level minimal requis par react-native-executorch. */
const MIN_ANDROID_API = 33;
/**
 * RAM minimale : 7 Go, ciblant les appareils « 8 Go » (expo-device rapporte
 * ~7,4-7,8 Go sur ceux-ci, la mémoire réservée système étant déduite). Le
 * modèle Gemma 4 E2B MM occupe ~4,4 Go chargé, + overhead runtime et vision.
 */
const MIN_TOTAL_MEMORY_BYTES = 7 * 1024 * 1024 * 1024;
/** Espace libre minimal : 6 Go (modèle ~4,4 Go + tokenizer + marge). */
const MIN_FREE_STORAGE_BYTES = 6 * 1024 * 1024 * 1024;

export type MealPhotoBlockReason = 'android-version' | 'memory' | 'storage';

export interface MealPhotoCapability {
  ok: boolean;
  reason?: MealPhotoBlockReason;
}

function isAndroidVersionOk(): boolean {
  if (Platform.OS !== 'android') return false;
  const apiLevel = typeof Platform.Version === 'string'
    ? parseInt(Platform.Version, 10)
    : Platform.Version;
  return Number.isFinite(apiLevel) && apiLevel >= MIN_ANDROID_API;
}

function loadDevice(): typeof import('expo-device') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-device') as typeof import('expo-device');
  } catch {
    return null;
  }
}

function loadFileSystem(): typeof import('expo-file-system/legacy') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
  } catch {
    return null;
  }
}

function loadKeepAwake(): typeof import('expo-keep-awake') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-keep-awake') as typeof import('expo-keep-awake');
  } catch {
    return null;
  }
}

/** Tag keep-awake partagé avec MealPhotoReview pendant le téléchargement du modèle. */
export const MEAL_PHOTO_KEEP_AWAKE_TAG = 'meal-photo-download';

/** Sous-répertoire où ExpoResourceFetcher écrit les fichiers finaux. */
const RNE_DIR_NAME = 'react-native-executorch/';

interface MealPhotoModelFile {
  /** URI du fichier final (documentDirectory/react-native-executorch/). */
  finalUri: string;
  /** URI du fichier partiel pendant le téléchargement (cacheDirectory). */
  cacheUri: string;
}

/**
 * Doit refléter `ResourceFetcherUtils.getFilenameFromUri` (react-native-executorch) :
 * URL sans protocole, fragment retiré, tout caractère hors [a-zA-Z0-9._-] → '_'.
 * Si cette règle change côté lib, les chemins calculés ici doivent suivre.
 */
function filenameFromUri(uri: string): string {
  const clean = uri.replace(/^https?:\/\//, '');
  return (clean.split('#')[0] ?? clean).replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Chemins attendus des fichiers du modèle (final + partiel de cache), ou null
 * si le filesystem ou le module executorch est indisponible (Jest, Expo Go).
 */
function getModelFileUris(): MealPhotoModelFile[] | null {
  const fs = loadFileSystem();
  if (!fs || !fs.documentDirectory || !fs.cacheDirectory) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GEMMA4_E2B_MM } = require('react-native-executorch') as typeof import('react-native-executorch');
    const sources: unknown[] = [
      GEMMA4_E2B_MM.modelSource,
      GEMMA4_E2B_MM.tokenizerSource,
      GEMMA4_E2B_MM.tokenizerConfigSource,
    ];
    const finalDir = `${fs.documentDirectory}${RNE_DIR_NAME}`;
    return sources
      .filter((source): source is string => typeof source === 'string')
      .map((source) => {
        const filename = filenameFromUri(source);
        return {
          finalUri: `${finalDir}${filename}`,
          cacheUri: `${fs.cacheDirectory}${filename}`,
        };
      });
  } catch {
    return null;
  }
}

/**
 * true si tous les fichiers du modèle sont présents ET non vides dans le
 * répertoire executorch. Sert à ne pas relancer un téléchargement déjà
 * complet (useLLM ne regarde que l'existence, pas la taille).
 */
export async function isMealPhotoModelDownloaded(): Promise<boolean> {
  const fs = loadFileSystem();
  const files = getModelFileUris();
  if (!fs || !files || files.length === 0) return false;

  for (const file of files) {
    try {
      const info = await fs.getInfoAsync(file.finalUri);
      if (!info.exists || info.size <= 0) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Supprime les fichiers partiels laissés dans le cache par un téléchargement
 * interrompu, pour que la tentative suivante reparte d'un état propre.
 */
async function deletePartialFiles(
  fs: NonNullable<ReturnType<typeof loadFileSystem>>,
  files: MealPhotoModelFile[]
): Promise<void> {
  for (const file of files) {
    try {
      const info = await fs.getInfoAsync(file.cacheUri);
      if (info.exists) await fs.deleteAsync(file.cacheUri);
    } catch {
      // Le partiel restant sera écrasé par la prochaine tentative : non bloquant.
    }
  }
}

/**
 * true si l'appareil peut faire tourner le VLM on-device.
 * Ne charge jamais react-native-executorch.
 */
export async function canUseMealPhoto(): Promise<MealPhotoCapability> {
  if (!isAndroidVersionOk()) {
    return { ok: false, reason: 'android-version' };
  }

  const device = loadDevice();
  if (!device || device.totalMemory === null || device.totalMemory < MIN_TOTAL_MEMORY_BYTES) {
    return { ok: false, reason: 'memory' };
  }

  const fs = loadFileSystem();
  if (!fs) {
    return { ok: false, reason: 'storage' };
  }
  try {
    const freeBytes = await fs.getFreeDiskStorageAsync();
    if (freeBytes < MIN_FREE_STORAGE_BYTES) {
      return { ok: false, reason: 'storage' };
    }
  } catch {
    return { ok: false, reason: 'storage' };
  }

  return { ok: true };
}

let executorchInitialized = false;

/**
 * Télécharge les ressources du modèle Gemma 4 E2B MM (modèle + tokenizer +
 * config) via ExpoResourceFetcher, SANS charger le modèle en mémoire. Utilisable hors
 * de la modale photo (ex. à la fin de l'onboarding). Idempotent : si les
 * fichiers sont déjà complets (existence + taille > 0), retourne true sans
 * rien relancer, et la modale MealPhotoReview réutilise ces mêmes fichiers.
 *
 * Pendant tout le téléchargement, expo-keep-awake empêche la mise en veille
 * (cause principale des coupures de ~4,4 Go). En cas d'échec, les fichiers
 * partiels du cache sont supprimés pour que la tentative suivante reparte
 * proprement (pas de reprise inter-session côté fetcher).
 *
 * Retourne false sans lever si le gating est KO, si le module natif est
 * absent (Jest, Expo Go) ou si le téléchargement échoue — l'échec est logué.
 */
export async function downloadMealPhotoModel(
  onProgress?: (progress: number) => void
): Promise<boolean> {
  const capability = await canUseMealPhoto();
  if (!capability.ok) return false;

  const fs = loadFileSystem();
  const files = getModelFileUris();
  if (!fs || !files) return false;

  // Déjà complet : ne pas relancer ~4,4 Go de téléchargement.
  if (await isMealPhotoModelDownloaded()) return true;

  const keepAwake = loadKeepAwake();
  try {
    keepAwake?.activateKeepAwake(MEAL_PHOTO_KEEP_AWAKE_TAG);
    // Partiels d'une tentative interrompue : suppression avant de repartir.
    await deletePartialFiles(fs, files);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GEMMA4_E2B_MM } = require('react-native-executorch') as typeof import('react-native-executorch');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExpoResourceFetcher } = require('react-native-executorch-expo-resource-fetcher') as typeof import('react-native-executorch-expo-resource-fetcher');
    await ExpoResourceFetcher.fetch(
      onProgress,
      GEMMA4_E2B_MM.modelSource,
      GEMMA4_E2B_MM.tokenizerSource,
      GEMMA4_E2B_MM.tokenizerConfigSource
    );
    // Vérif post-téléchargement : tous les fichiers attendus existent, non vides.
    return await isMealPhotoModelDownloaded();
  } catch (error) {
    console.warn('[mealPhoto] échec du téléchargement du modèle', error);
    await deletePartialFiles(fs, files);
    return false;
  } finally {
    keepAwake?.deactivateKeepAwake(MEAL_PHOTO_KEEP_AWAKE_TAG);
  }
}

/**
 * Initialise le runtime executorch (resource fetcher Expo), uniquement si le
 * gating est OK. Idempotent. Toute erreur (module natif absent, Expo Go) est
 * avalée : la feature reste simplement cachée.
 */
export async function initMealPhotoRuntime(): Promise<void> {
  if (executorchInitialized) return;
  const capability = await canUseMealPhoto();
  if (!capability.ok) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initExecutorch } = require('react-native-executorch') as typeof import('react-native-executorch');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExpoResourceFetcher } = require('react-native-executorch-expo-resource-fetcher') as typeof import('react-native-executorch-expo-resource-fetcher');
    initExecutorch({ resourceFetcher: ExpoResourceFetcher });
    executorchInitialized = true;
  } catch {
    // Module natif indisponible : la modale photo dégradera proprement.
  }
}
