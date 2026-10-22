import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  billing,
  INACTIVE_ENTITLEMENT,
  type BillingPlan,
  type BillingProvider,
  type EntitlementState,
  type PurchaseResult,
} from '../lib/billing';
import { getDeviceId } from '../lib/deviceIdentity';
import type { QuotaTier } from '../lib/mealPhotoQuota';
import { asyncStorageAdapter } from '../storage/storageAdapter';
import { useMealPhotoQuotaStore } from './mealPhotoQuotaStore';

export type PlansState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

interface SubscriptionStore {
  entitlement: EntitlementState;
  plans: BillingPlan[];
  plansState: PlansState;
  /** Prepare le fournisseur et relit l'etat de l'abonnement. Sans effet s'il est indisponible. */
  init: () => Promise<void>;
  loadPlans: () => Promise<void>;
  purchase: (planId: string) => Promise<PurchaseResult>;
  restore: () => Promise<EntitlementState | null>;
}

/**
 * Palier connu LOCALEMENT, pour l'affichage hors ligne. Le serveur reste seul
 * juge au moment de l'analyse : un etat local trafique ne donne aucune analyse
 * de plus.
 */
export function localTier(entitlement: EntitlementState, now: Date = new Date()): QuotaTier {
  if (!entitlement.active) return 'free';
  if (entitlement.expiresAt && new Date(entitlement.expiresAt).getTime() <= now.getTime()) {
    return 'free';
  }
  return 'premium';
}

let provider: BillingProvider = billing;
let unsubscribe: (() => void) | null = null;

/** Pour les tests uniquement. */
export function setBillingProviderForTests(next: BillingProvider): void {
  provider = next;
  unsubscribe?.();
  unsubscribe = null;
}

async function ready(): Promise<boolean> {
  const deviceId = getDeviceId();
  if (!provider.isAvailable() || !deviceId) return false;
  await provider.configure(deviceId);
  return true;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set) => ({
      entitlement: INACTIVE_ENTITLEMENT,
      plans: [],
      plansState: 'idle',

      init: async () => {
        try {
          if (!(await ready())) return;
          if (!unsubscribe) {
            unsubscribe = provider.onEntitlementChange((entitlement) => set({ entitlement }));
          }
          set({ entitlement: await provider.getEntitlement() });
        } catch {
          // Hors ligne ou boutique indisponible : on garde le dernier etat connu.
        }
      },

      loadPlans: async () => {
        set({ plansState: 'loading' });
        try {
          if (!(await ready())) {
            set({ plansState: 'unavailable', plans: [] });
            return;
          }
          const plans = await provider.getPlans();
          set({ plans, plansState: plans.length > 0 ? 'ready' : 'unavailable' });
        } catch {
          set({ plansState: 'error' });
        }
      },

      purchase: async (planId) => {
        const result = await provider.purchase(planId);
        if (result.status === 'purchased') {
          set({ entitlement: result.entitlement });
          // Le serveur doit savoir tout de suite : sans `refresh`, son cache
          // le laisserait au palier gratuit jusqu'a 10 minutes.
          await useMealPhotoQuotaStore.getState().syncServer({ refresh: true });
        }
        return result;
      },

      restore: async () => {
        try {
          if (!(await ready())) return null;
          const entitlement = await provider.restore();
          set({ entitlement });
          await useMealPhotoQuotaStore.getState().syncServer({ refresh: true });
          return entitlement;
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'subscription-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({ entitlement: s.entitlement }),
    }
  )
);
