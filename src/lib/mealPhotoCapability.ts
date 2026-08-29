/**
 * Gating de la feature « estimation de repas par photo » (mode serveur).
 *
 * Le modèle v9 (LFM2.5-VL-450M fine-tuné, GGUF) ne tourne PLUS sur
 * l'appareil : il est hébergé par un llama-server (PC local ou VPS) et l'app
 * envoie la photo en HTTPS — voir lib/mealPhotoApi.ts. Il n'y a donc plus
 * rien à télécharger ni de contrainte RAM/stockage côté téléphone.
 *
 * Seule exigence : Android (cohérent avec la cible de l'app) et une configuration
 * serveur complète. Les signatures historiques sont conservées pour ne pas
 * toucher index.tsx / add.tsx / photo.tsx / onboarding.tsx / _layout.tsx.
 */

import { Platform } from 'react-native';

import { MEAL_SERVER_API_KEY, MEAL_SERVER_URL } from './mealPhotoApi';

/** Android API level minimal (inchangé — cible historique de l'app). */
const MIN_ANDROID_API = 33;

export type MealPhotoBlockReason = 'android-version' | 'server-config';

export interface MealPhotoCapability {
  ok: boolean;
  reason?: MealPhotoBlockReason;
}

/**
 * true si la feature est utilisable : Android récent + URL et clé serveur renseignées.
 * Aucune dépendance native — testable sous Jest.
 */
export async function canUseMealPhoto(): Promise<MealPhotoCapability> {
  const apiLevel =
    typeof Platform.Version === 'string' ? parseInt(Platform.Version, 10) : Platform.Version;
  if (Platform.OS !== 'android' || !Number.isFinite(apiLevel) || apiLevel < MIN_ANDROID_API) {
    return { ok: false, reason: 'android-version' };
  }
  if (!MEAL_SERVER_URL || !MEAL_SERVER_API_KEY) {
    return { ok: false, reason: 'server-config' };
  }
  return { ok: true };
}
