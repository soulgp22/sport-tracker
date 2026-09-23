import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  consumeQuota,
  mergeServerQuota,
  quotaDayKey,
  type MealPhotoQuotaState,
  type MealPhotoQuotaStatus,
  type QuotaTier,
  type ServerQuotaStatus,
} from '../lib/mealPhotoQuota';
import { fetchServerQuota, postConsume } from '../lib/mealQuotaClient';
import { asyncStorageAdapter } from '../storage/storageAdapter';

/** Repas declares localement mais pas encore acceptes par le serveur. */
const MAX_PENDING = 50;

interface MealPhotoQuotaStore extends MealPhotoQuotaState {
  /** Derniere reponse du serveur (il fait foi sur le palier et le compteur). */
  server: ServerQuotaStatus | null;
  pending: string[];
  /**
   * A appeler quand un repas analyse est ENREGISTRE au journal, une seule fois
   * par repas. `analysisId` = celui envoye avec l'analyse : il rend la
   * declaration idempotente cote serveur.
   */
  recordAnalyzedMeal: (analysisId?: string) => void;
  /** Interroge le serveur et renvoie ses repas en attente. */
  syncServer: (options?: { refresh?: boolean }) => Promise<void>;
  /** Etat recu d'ailleurs (refus 402 d'une analyse). */
  applyServerStatus: (status: ServerQuotaStatus) => void;
  /** Etat du quota pour aujourd'hui ; `localTier` s'applique sans reponse serveur. */
  status: (localTier?: QuotaTier) => MealPhotoQuotaStatus;
}

/**
 * Compteur persistant du quota photo. La regle vit dans `lib/mealPhotoQuota`
 * (module pur) ; ce store conserve le compteur local, la derniere reponse du
 * serveur et les declarations a renvoyer apres une coupure reseau.
 */
export const useMealPhotoQuotaStore = create<MealPhotoQuotaStore>()(
  persist(
    (set, get) => ({
      date: quotaDayKey(),
      mealsAnalyzed: 0,
      server: null,
      pending: [],

      recordAnalyzedMeal: (analysisId) => {
        const { date, mealsAnalyzed } = get();
        set(consumeQuota({ date, mealsAnalyzed }));
        if (!analysisId) return;
        set((s) => ({ pending: [...s.pending, analysisId].slice(-MAX_PENDING) }));
        void get().syncServer();
      },

      syncServer: async (options) => {
        let latest: ServerQuotaStatus | null = null;
        for (const analysisId of [...get().pending]) {
          const status = await postConsume(analysisId);
          if (!status) break;
          latest = status;
          set((s) => ({ pending: s.pending.filter((id) => id !== analysisId) }));
        }
        const status = (await fetchServerQuota(options)) ?? latest;
        if (status) set({ server: status });
      },

      applyServerStatus: (status) => set({ server: status }),

      status: (localTier = 'free') => {
        const { date, mealsAnalyzed, server } = get();
        return mergeServerQuota({ date, mealsAnalyzed }, server, quotaDayKey(), localTier);
      },
    }),
    {
      name: 'meal-photo-quota-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({
        date: s.date,
        mealsAnalyzed: s.mealsAnalyzed,
        server: s.server,
        pending: s.pending,
      }),
    }
  )
);
