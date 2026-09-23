/**
 * Contrat de facturation, independant du fournisseur.
 *
 * Aujourd'hui RevenueCat (lib/billing/revenueCat). Decision d'Islam
 * (2026-09-22) : au-dela de 2 500 $ de revenus mensuels, on repasse sur Google
 * Play Billing en direct. Ce contrat est la frontiere qui rend ce changement
 * local : l'ecran d'abonnement, le store et les tests ne connaissent que lui.
 */

export type PlanPeriod = 'monthly' | 'annual';

export interface BillingPlan {
  /** Identifiant opaque, propre au fournisseur, a repasser a `purchase`. */
  id: string;
  period: PlanPeriod;
  /** Prix formate par la boutique, dans la devise et la langue de l'utilisateur. */
  priceString: string;
  price: number;
  currencyCode: string;
  /** Equivalent mensuel formate par la boutique (annuel / 12), si disponible. */
  pricePerMonthString: string | null;
}

export interface EntitlementState {
  active: boolean;
  /** Fin de la periode payee (ISO 8601), null si inconnue ou sans fin. */
  expiresAt: string | null;
  willRenew: boolean;
  productId: string | null;
  /** Page de gestion de l'abonnement dans la boutique. */
  managementUrl: string | null;
}

export const INACTIVE_ENTITLEMENT: EntitlementState = {
  active: false,
  expiresAt: null,
  willRenew: false,
  productId: null,
  managementUrl: null,
};

export type BillingErrorCode =
  | 'unavailable'
  | 'network'
  | 'pending'
  | 'not-allowed'
  | 'already-owned'
  | 'store'
  | 'unknown';

export type PurchaseResult =
  | { status: 'purchased'; entitlement: EntitlementState }
  | { status: 'cancelled' }
  | { status: 'error'; code: BillingErrorCode };

export interface BillingProvider {
  /** False si le fournisseur n'est pas configure (cle absente) ou pas pris en charge. */
  isAvailable(): boolean;
  /** Idempotent. `appUserId` = identifiant d'appareil (lib/deviceIdentity). */
  configure(appUserId: string): Promise<void>;
  getPlans(): Promise<BillingPlan[]>;
  purchase(planId: string): Promise<PurchaseResult>;
  restore(): Promise<EntitlementState>;
  getEntitlement(): Promise<EntitlementState>;
  /** Renvoie la fonction de desabonnement. */
  onEntitlementChange(listener: (entitlement: EntitlementState) => void): () => void;
}
