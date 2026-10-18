import { shouldRequestReview } from './reviewPrompt';
import { useReviewPromptStore } from '../store/reviewPromptStore';

/**
 * Demande d'avis Google Play par la fenetre officielle (`expo-store-review`,
 * API Play In-App Review). Ne leve jamais : un avis n'est pas une fonction de
 * l'app, son echec ne doit rien casser.
 *
 * Google decide seul d'afficher ou non la fenetre (quota par utilisateur) et
 * ne dit pas si l'utilisateur a note : on enregistre donc la DEMANDE, pas
 * l'avis, et on ne redemande pas avant le delai de `reviewPrompt.ts`.
 */

/** Delai apres la fin de seance : laisser l'ecran Stats s'afficher d'abord. */
export const REVIEW_PROMPT_DELAY_MS = 1500;

type StoreReviewModule = typeof import('expo-store-review');

function loadStoreReview(): StoreReviewModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-store-review') as StoreReviewModule;
  } catch {
    return null;
  }
}

/**
 * Demande un avis si la regle le permet. Renvoie true si la fenetre de Google
 * a ete sollicitee (affichee ou non, Google ne le dit pas).
 */
export async function maybeRequestStoreReview(
  completedSessions: number,
  now: Date = new Date()
): Promise<boolean> {
  try {
    // Stockage pas encore lu : la date de derniere demande paraitrait vide et
    // on redemanderait trop tot. On attend la prochaine seance.
    if (!useReviewPromptStore.persist.hasHydrated()) return false;
    if (!shouldRequestReview(completedSessions, useReviewPromptStore.getState(), now)) {
      return false;
    }
    const StoreReview = loadStoreReview();
    if (!StoreReview || !(await StoreReview.isAvailableAsync())) return false;
    await StoreReview.requestReview();
    useReviewPromptStore.getState().markRequested(now);
    return true;
  } catch (error) {
    if (__DEV__) console.warn('[storeReview] requestReview', error);
    return false;
  }
}
