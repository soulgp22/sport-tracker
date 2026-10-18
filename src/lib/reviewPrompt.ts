/**
 * Quand demander un avis Google Play (fenetre officielle « In-App Review »).
 *
 * Regle (plan marketing, 2026-10-18) : apres un moment positif, la fin d'une
 * seance. Premiere demande a la 3e seance terminee : l'utilisateur connait
 * l'app et vient de reussir quelque chose. Ensuite, au plus une fois tous les
 * 120 jours. Google applique en plus son propre quota et peut ne rien
 * afficher : l'app ne doit jamais dependre de l'affichage.
 *
 * Module PUR (aucune dependance au stockage ni a l'UI), pour verifier la regle
 * sans appareil (AGENTS.md 4).
 */

/** Seances terminees avant la premiere demande. */
export const REVIEW_FIRST_AT_SESSIONS = 3;
/** Delai minimal entre deux demandes, en jours. */
export const REVIEW_MIN_INTERVAL_DAYS = 120;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewPromptState {
  /** Date ISO de la derniere demande, null si jamais demande. */
  lastRequestedAt: string | null;
}

export function shouldRequestReview(
  completedSessions: number,
  state: ReviewPromptState,
  now: Date = new Date()
): boolean {
  if (completedSessions < REVIEW_FIRST_AT_SESSIONS) return false;
  if (!state.lastRequestedAt) return true;
  const last = new Date(state.lastRequestedAt).getTime();
  // Date illisible (stockage corrompu) : on traite comme « jamais demande »
  // plutot que de bloquer la demande pour toujours.
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= REVIEW_MIN_INTERVAL_DAYS * DAY_MS;
}
