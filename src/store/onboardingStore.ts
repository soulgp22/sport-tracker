import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';

interface OnboardingState {
  completed: boolean;
  hasHydrated: boolean;
  complete: () => void;
  restart: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      hasHydrated: false,
      complete: () => set({ completed: true }),
      restart: () => set({ completed: false }),
    }),
    {
      name: 'onboarding-store-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({ completed: state.completed }),
      merge: (persisted, current) => {
        // Couche 1 — merge ne doit JAMAIS lever
        // Le profile d'un ancien état persisté est volontairement IGNORÉ (ni lu, ni recopié).
        try {
          if (!persisted || typeof persisted !== 'object') {
            return { ...current, completed: false };
          }
          const saved = persisted as Record<string, unknown>;
          return {
            ...current,
            completed: typeof saved.completed === 'boolean' ? saved.completed : false,
          };
        } catch {
          return { ...current, completed: false };
        }
      },
      // Couche 2 — onRehydrateStorage est appelé sur le chemin SUCCÈS et sur le chemin ERREUR
      onRehydrateStorage: () => (state, error) => {
        // Ce callback est invoqué par zustand :
        //   - En succès : postRehydrationCallback(get(), undefined)
        //   - En erreur  : postRehydrationCallback(undefined, error)
        // Dans les deux cas, on libère l'écran.
        if (!useOnboardingStore.getState().hasHydrated) {
          useOnboardingStore.setState({ hasHydrated: true });
        }
      },
    }
  )
);

// Couche 3 — filet de sécurité : si l'hydratation ne se termine jamais,
// libérer l'écran après 5 secondes.
let hydrationTimer: ReturnType<typeof setTimeout> | null = null;

useOnboardingStore.persist.onFinishHydration(() => {
  if (hydrationTimer !== null) {
    clearTimeout(hydrationTimer);
    hydrationTimer = null;
  }
  if (!useOnboardingStore.getState().hasHydrated) {
    useOnboardingStore.setState({ hasHydrated: true });
  }
});

if (useOnboardingStore.persist.hasHydrated()) {
  if (hydrationTimer !== null) {
    clearTimeout(hydrationTimer);
    hydrationTimer = null;
  }
  useOnboardingStore.setState({ hasHydrated: true });
}

if (!useOnboardingStore.persist.hasHydrated()) {
  hydrationTimer = setTimeout(() => {
    hydrationTimer = null;
    if (!useOnboardingStore.getState().hasHydrated) {
      useOnboardingStore.setState({ hasHydrated: true });
    }
  }, 5000);
}
