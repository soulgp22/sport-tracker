/**
 * Quota journalier de l'analyse photo de repas.
 *
 * Regle produit : **2 REPAS par jour**, pas 2 detections. Un repas est compte
 * quand son analyse est ENREGISTREE au journal — une analyse relancee, une
 * correction, ou un plat finalement abandonne ne consomment rien. L'utilisateur
 * n'est donc jamais puni d'avoir retente une photo ratee.
 *
 * Au-dela, un compte payant sera requis. Il n'existe pas encore : l'ecran
 * l'annonce sans promettre de date.
 *
 * Module PUR : aucune dependance au stockage ni a l'UI, pour que la regle soit
 * verifiable sans appareil (AGENTS.md 4).
 */

/** Nombre de repas analysables par photo et par jour sans compte payant. */
export const DAILY_MEAL_PHOTO_LIMIT = 2;

export interface MealPhotoQuotaState {
  /** Jour observe, au format AAAA-MM-JJ. */
  date: string;
  /** Repas deja enregistres depuis une analyse photo ce jour-la. */
  mealsAnalyzed: number;
}

export interface MealPhotoQuotaStatus {
  used: number;
  remaining: number;
  reached: boolean;
  limit: number;
}

/** Jour local au format AAAA-MM-JJ. Local et non UTC : le quota suit la journee de l'utilisateur. */
export function quotaDayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Etat du quota pour le jour donne.
 *
 * Un etat portant sur un autre jour est traite comme vide : le compteur se
 * remet a zero au changement de date sans avoir besoin d'une tache planifiee.
 */
export function resolveQuota(
  state: MealPhotoQuotaState | null | undefined,
  today: string = quotaDayKey()
): MealPhotoQuotaStatus {
  const used = state && state.date === today ? Math.max(0, Math.floor(state.mealsAnalyzed)) : 0;
  const capped = Math.min(used, DAILY_MEAL_PHOTO_LIMIT);
  return {
    used,
    remaining: Math.max(0, DAILY_MEAL_PHOTO_LIMIT - capped),
    reached: used >= DAILY_MEAL_PHOTO_LIMIT,
    limit: DAILY_MEAL_PHOTO_LIMIT,
  };
}

/** Etat apres enregistrement d'un repas analyse. Repart de zero si le jour a change. */
export function consumeQuota(
  state: MealPhotoQuotaState | null | undefined,
  today: string = quotaDayKey()
): MealPhotoQuotaState {
  const used = state && state.date === today ? Math.max(0, Math.floor(state.mealsAnalyzed)) : 0;
  return { date: today, mealsAnalyzed: used + 1 };
}
