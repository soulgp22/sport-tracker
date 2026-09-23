/**
 * Quota journalier de l'analyse photo de repas.
 *
 * Regle produit : on compte des REPAS, pas des detections. Un repas est compte
 * quand son analyse est ENREGISTREE au journal — une analyse relancee, une
 * correction, ou un plat finalement abandonne ne consomment rien. L'utilisateur
 * n'est donc jamais puni d'avoir retente une photo ratee.
 *
 * Deux paliers (decision d'Islam, 2026-09-22) :
 * - gratuit : 2 repas par jour ;
 * - abonnement (9,99 €/mois ou 79,99 €/an) : 100 repas par jour.
 *
 * Le SERVEUR fait foi (service lst-quota) : ce module ne sert qu'a afficher
 * l'etat sans attendre le reseau, et a garder la regle hors ligne. Voir
 * `mergeServerQuota`.
 *
 * Module PUR : aucune dependance au stockage ni a l'UI, pour que la regle soit
 * verifiable sans appareil (AGENTS.md 4).
 */

export type QuotaTier = 'free' | 'premium';

/** Repas analysables par photo et par jour sans abonnement. */
export const FREE_DAILY_MEAL_PHOTO_LIMIT = 2;
/** Repas analysables par photo et par jour avec l'abonnement. */
export const PREMIUM_DAILY_MEAL_PHOTO_LIMIT = 100;

/** @deprecated alias historique de la limite gratuite. */
export const DAILY_MEAL_PHOTO_LIMIT = FREE_DAILY_MEAL_PHOTO_LIMIT;

export function limitForTier(tier: QuotaTier): number {
  return tier === 'premium' ? PREMIUM_DAILY_MEAL_PHOTO_LIMIT : FREE_DAILY_MEAL_PHOTO_LIMIT;
}

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
  tier: QuotaTier;
}

/** Etat du quota tel que le serveur le renvoie (`GET /v1/quota`). */
export interface ServerQuotaStatus {
  day: string;
  tier: QuotaTier;
  limit: number;
  used: number;
}

/** Jour local au format AAAA-MM-JJ. Local et non UTC : le quota suit la journee de l'utilisateur. */
export function quotaDayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function usedToday(state: MealPhotoQuotaState | null | undefined, today: string): number {
  return state && state.date === today ? Math.max(0, Math.floor(state.mealsAnalyzed)) : 0;
}

function statusFor(used: number, limit: number, tier: QuotaTier): MealPhotoQuotaStatus {
  return {
    used,
    remaining: Math.max(0, limit - Math.min(used, limit)),
    reached: used >= limit,
    limit,
    tier,
  };
}

/**
 * Etat du quota pour le jour donne.
 *
 * Un etat portant sur un autre jour est traite comme vide : le compteur se
 * remet a zero au changement de date sans avoir besoin d'une tache planifiee.
 */
export function resolveQuota(
  state: MealPhotoQuotaState | null | undefined,
  today: string = quotaDayKey(),
  tier: QuotaTier = 'free'
): MealPhotoQuotaStatus {
  return statusFor(usedToday(state, today), limitForTier(tier), tier);
}

/**
 * Combine le compteur local et la reponse du serveur, pour l'AFFICHAGE.
 *
 * - Palier : abonne si le serveur OU l'abonnement connu localement le dit.
 *   Juste apres un achat, le cache du serveur peut encore dire « gratuit » ;
 *   bloquer l'ecran a ce moment serait absurde. Ce n'est pas une faille : le
 *   serveur reste seul juge au moment de l'analyse (HTTP 402).
 * - Le compteur retenu est le plus grand des deux : un repas enregistre hors
 *   ligne n'est pas encore connu du serveur, et l'inverse arrive apres une
 *   reinstallation. Prendre le minimum rendrait des repas gratuits.
 * - Une reponse portant sur un autre jour (fuseau, minuit passe entre-temps)
 *   est ignoree : le compteur local seul s'applique.
 */
export function mergeServerQuota(
  local: MealPhotoQuotaState | null | undefined,
  server: ServerQuotaStatus | null | undefined,
  today: string = quotaDayKey(),
  localTier: QuotaTier = 'free'
): MealPhotoQuotaStatus {
  const localUsed = usedToday(local, today);
  if (!server || server.day !== today) {
    return statusFor(localUsed, limitForTier(localTier), localTier);
  }
  const used = Math.max(localUsed, Math.max(0, Math.floor(server.used)));
  const tier: QuotaTier = server.tier === 'premium' || localTier === 'premium' ? 'premium' : 'free';
  return statusFor(used, limitForTier(tier), tier);
}

/** Etat apres enregistrement d'un repas analyse. Repart de zero si le jour a change. */
export function consumeQuota(
  state: MealPhotoQuotaState | null | undefined,
  today: string = quotaDayKey()
): MealPhotoQuotaState {
  return { date: today, mealsAnalyzed: usedToday(state, today) + 1 };
}
