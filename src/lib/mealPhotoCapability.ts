/**
 * Gating de la feature « estimation de repas par photo » (VLM on-device).
 *
 * react-native-executorch exige Android API 33+ (arm64), ~1 Go de modèle à
 * télécharger et beaucoup de RAM en inférence. La feature n'est donc exposée
 * que sur les appareils capables. Le module executorch n'est JAMAIS importé
 * ici : il est chargé dynamiquement (require dans try/catch, pattern
 * healthConnect) uniquement quand le gating est OK, ce qui le rend inerte
 * sous Jest, Expo Go et les appareils exclus.
 */

import { Platform } from 'react-native';

/** Android API level minimal requis par react-native-executorch. */
const MIN_ANDROID_API = 33;
/** RAM minimale : 5,5 Go (le modèle LFM2.5-VL 1.6B quantifié tient difficilement en dessous). */
const MIN_TOTAL_MEMORY_BYTES = 5.5 * 1024 * 1024 * 1024;
/** Espace libre minimal : 3,5 Go (modèle ~1 Go + tokenizer + marge). */
const MIN_FREE_STORAGE_BYTES = 3.5 * 1024 * 1024 * 1024;

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
