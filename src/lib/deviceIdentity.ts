/**
 * Identifiant d'appareil pour le quota serveur et l'abonnement.
 *
 * Source : `Settings.Secure.ANDROID_ID` via expo-application. Sur Android 8+,
 * il est propre au couple (cle de signature de l'app, utilisateur, appareil) :
 * - il SURVIT a une desinstallation : effacer les donnees ou reinstaller
 *   l'app ne remet pas le quota gratuit a zero ;
 * - il ne permet PAS de suivre l'utilisateur d'une app a l'autre ;
 * - il change apres une remise a zero d'usine, ou si la cle de signature
 *   change (un build local signe `lst-release` n'a pas le meme que la version
 *   Play).
 *
 * Le meme identifiant sert d'identifiant client chez RevenueCat : le serveur
 * interroge RevenueCat avec lui pour savoir si l'appareil est abonne.
 *
 * Hors Android (web, tests), renvoie null : le serveur traite alors la
 * requete comme une ancienne version de l'app (voir lst-quota, transition).
 */
import { Platform } from 'react-native';

const PREFIX = 'and-';
/** Meme contrainte que le serveur : un identifiant hors format est refuse. */
export const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

let cached: string | null | undefined;

export function toDeviceId(androidId: string | null | undefined): string | null {
  if (typeof androidId !== 'string') return null;
  const trimmed = androidId.trim();
  if (!trimmed) return null;
  const candidate = `${PREFIX}${trimmed}`;
  return DEVICE_ID_PATTERN.test(candidate) ? candidate : null;
}

export function getDeviceId(): string | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'android') {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Application = require('expo-application') as typeof import('expo-application');
    cached = toDeviceId(Application.getAndroidId());
  } catch {
    cached = null;
  }
  return cached;
}

/** Pour les tests uniquement. */
export function resetDeviceIdCache(): void {
  cached = undefined;
}
