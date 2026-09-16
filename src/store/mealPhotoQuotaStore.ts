import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  consumeQuota,
  quotaDayKey,
  resolveQuota,
  type MealPhotoQuotaState,
  type MealPhotoQuotaStatus,
} from '../lib/mealPhotoQuota';
import { asyncStorageAdapter } from '../storage/storageAdapter';

interface MealPhotoQuotaStore extends MealPhotoQuotaState {
  /** A appeler quand un repas analyse est ENREGISTRE au journal, une seule fois par repas. */
  recordAnalyzedMeal: () => void;
  /** Etat du quota pour aujourd'hui, remis a zero automatiquement au changement de jour. */
  status: () => MealPhotoQuotaStatus;
}

/**
 * Compteur persistant du quota photo. La regle vit dans `lib/mealPhotoQuota`
 * (module pur) ; ce store ne fait que la conserver d'une session a l'autre.
 */
export const useMealPhotoQuotaStore = create<MealPhotoQuotaStore>()(
  persist(
    (set, get) => ({
      date: quotaDayKey(),
      mealsAnalyzed: 0,

      recordAnalyzedMeal: () => {
        const { date, mealsAnalyzed } = get();
        set(consumeQuota({ date, mealsAnalyzed }));
      },

      status: () => {
        const { date, mealsAnalyzed } = get();
        return resolveQuota({ date, mealsAnalyzed });
      },
    }),
    {
      name: 'meal-photo-quota-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (s) => ({ date: s.date, mealsAnalyzed: s.mealsAnalyzed }),
    }
  )
);
