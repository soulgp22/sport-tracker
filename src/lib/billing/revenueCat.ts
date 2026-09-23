/**
 * Fournisseur de facturation RevenueCat (react-native-purchases).
 *
 * RevenueCat verifie chaque achat aupres de Google Play, suit renouvellements,
 * remboursements et resiliations, et expose l'etat « abonne » par une API que
 * le serveur lst-quota interroge. Retenu plutot que Google Play Billing en
 * direct pour ne pas ecrire ni heberger cette verification (decision d'Islam,
 * 2026-09-22, retour prevu vers Google Play au-dela de 2 500 $/mois).
 *
 * Le module natif est charge a la demande : sous Jest, sur le web, ou sans cle
 * configuree, le fournisseur se declare simplement indisponible.
 */
import { Platform } from 'react-native';

import {
  INACTIVE_ENTITLEMENT,
  type BillingErrorCode,
  type BillingPlan,
  type BillingProvider,
  type EntitlementState,
  type PurchaseResult,
} from './types';

type PurchasesModule = typeof import('react-native-purchases').default;
type CustomerInfo = import('react-native-purchases').CustomerInfo;
type PurchasesPackage = import('react-native-purchases').PurchasesPackage;

/** Droit d'acces configure dans RevenueCat. Le serveur interroge le meme. */
export const PREMIUM_ENTITLEMENT_ID = 'premium';

/**
 * Cle SDK publique Android (`goog_…`). Publique par conception : elle ne
 * permet que d'initier des achats, pas de lire les donnees des clients.
 */
export const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

function loadPurchases(): PurchasesModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as { default: PurchasesModule };
    return mod.default ?? null;
  } catch {
    return null;
  }
}

export function toEntitlement(info: CustomerInfo | null | undefined): EntitlementState {
  const entry = info?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
  if (!entry || !entry.isActive) {
    return { ...INACTIVE_ENTITLEMENT, managementUrl: info?.managementURL ?? null };
  }
  return {
    active: true,
    expiresAt: entry.expirationDate ?? null,
    willRenew: entry.willRenew,
    productId: entry.productIdentifier ?? null,
    managementUrl: info?.managementURL ?? null,
  };
}

export function toPlan(pkg: PurchasesPackage): BillingPlan | null {
  const period =
    pkg.packageType === 'MONTHLY' ? 'monthly' : pkg.packageType === 'ANNUAL' ? 'annual' : null;
  if (!period) return null;
  return {
    id: pkg.identifier,
    period,
    priceString: pkg.product.priceString,
    price: pkg.product.price,
    currencyCode: pkg.product.currencyCode,
    pricePerMonthString: pkg.product.pricePerMonthString ?? null,
  };
}

/** Codes d'erreur RevenueCat (PURCHASES_ERROR_CODE) -> contrat neutre. */
export function toBillingErrorCode(code: unknown): BillingErrorCode {
  switch (String(code)) {
    case '10': // NETWORK_ERROR
    case '35': // OFFLINE_CONNECTION_ERROR
      return 'network';
    case '20': // PAYMENT_PENDING_ERROR
      return 'pending';
    case '3': // PURCHASE_NOT_ALLOWED_ERROR
      return 'not-allowed';
    case '6': // PRODUCT_ALREADY_PURCHASED_ERROR
      return 'already-owned';
    case '2': // STORE_PROBLEM_ERROR
    case '5': // PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR
      return 'store';
    case '23': // CONFIGURATION_ERROR
    case '11': // INVALID_CREDENTIALS_ERROR
      return 'unavailable';
    default:
      return 'unknown';
  }
}

const CANCELLED_CODE = '1'; // PURCHASE_CANCELLED_ERROR

export function createRevenueCatProvider(
  apiKey: string = REVENUECAT_ANDROID_KEY,
  load: () => PurchasesModule | null = loadPurchases
): BillingProvider {
  let purchases: PurchasesModule | null = null;
  let configuredFor: string | null = null;
  const packages = new Map<string, PurchasesPackage>();

  const available = () => Platform.OS === 'android' && apiKey.length > 0;

  const requirePurchases = (): PurchasesModule => {
    if (!purchases) throw new Error('RevenueCat non configure');
    return purchases;
  };

  return {
    isAvailable: available,

    async configure(appUserId) {
      if (!available() || configuredFor === appUserId) return;
      purchases = purchases ?? load();
      if (!purchases) throw new Error('react-native-purchases introuvable');
      if (configuredFor === null) {
        purchases.configure({ apiKey, appUserID: appUserId });
      } else {
        await purchases.logIn(appUserId);
      }
      configuredFor = appUserId;
    },

    async getPlans() {
      const offerings = await requirePurchases().getOfferings();
      const current = offerings.current?.availablePackages ?? [];
      packages.clear();
      const plans: BillingPlan[] = [];
      for (const pkg of current) {
        const plan = toPlan(pkg);
        if (!plan) continue;
        packages.set(plan.id, pkg);
        plans.push(plan);
      }
      return plans;
    },

    async purchase(planId): Promise<PurchaseResult> {
      const pkg = packages.get(planId);
      if (!pkg) return { status: 'error', code: 'store' };
      try {
        const { customerInfo } = await requirePurchases().purchasePackage(pkg);
        const entitlement = toEntitlement(customerInfo);
        // Paiement accepte mais droit absent : configuration RevenueCat
        // incoherente (produit non rattache au droit). Ne pas pretendre au succes.
        if (!entitlement.active) return { status: 'error', code: 'store' };
        return { status: 'purchased', entitlement };
      } catch (error) {
        const code = (error as { code?: unknown; userCancelled?: boolean | null })?.code;
        if (String(code) === CANCELLED_CODE || (error as { userCancelled?: boolean })?.userCancelled) {
          return { status: 'cancelled' };
        }
        return { status: 'error', code: toBillingErrorCode(code) };
      }
    },

    async restore() {
      return toEntitlement(await requirePurchases().restorePurchases());
    },

    async getEntitlement() {
      return toEntitlement(await requirePurchases().getCustomerInfo());
    },

    onEntitlementChange(listener) {
      if (!purchases) return () => undefined;
      const handler = (info: CustomerInfo) => listener(toEntitlement(info));
      purchases.addCustomerInfoUpdateListener(handler);
      const module = purchases;
      return () => {
        module.removeCustomerInfoUpdateListener(handler);
      };
    },
  };
}
