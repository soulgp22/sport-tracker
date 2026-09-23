/**
 * Regles d'affichage des offres, pures et testables.
 *
 * Aucun prix n'est ecrit en dur : tout vient de la boutique, qui les convertit
 * dans la devise de chaque pays. L'economie de l'annuel est donc CALCULEE a
 * partir des prix reels — un « -33 % » code en dur mentirait des qu'un pays
 * aurait un prix arrondi differemment.
 */
import type { BillingPlan, PlanPeriod } from './types';

export interface PlanPair {
  monthly: BillingPlan | null;
  annual: BillingPlan | null;
}

export function pickPlans(plans: BillingPlan[]): PlanPair {
  const byPeriod = (period: PlanPeriod) => plans.find((p) => p.period === period) ?? null;
  return { monthly: byPeriod('monthly'), annual: byPeriod('annual') };
}

/**
 * Economie de l'annuel par rapport a douze mensualites, en pourcentage entier
 * ARRONDI VERS LE BAS : on n'annonce jamais plus que l'economie reelle.
 * Null si la comparaison n'a pas de sens (devises differentes, prix absurdes,
 * annuel pas moins cher).
 */
export function annualSavingsPercent(monthly: BillingPlan | null, annual: BillingPlan | null): number | null {
  if (!monthly || !annual) return null;
  if (monthly.currencyCode !== annual.currencyCode) return null;
  if (!(monthly.price > 0) || !(annual.price > 0)) return null;
  const yearOfMonthly = monthly.price * 12;
  if (annual.price >= yearOfMonthly) return null;
  const percent = Math.floor(((yearOfMonthly - annual.price) / yearOfMonthly) * 100 + 1e-9);
  return percent > 0 ? percent : null;
}

/** Offre preselectionnee : l'annuel quand il existe (meilleur prix au mois). */
export function defaultPlanPeriod(pair: PlanPair): PlanPeriod | null {
  if (pair.annual) return 'annual';
  if (pair.monthly) return 'monthly';
  return null;
}
