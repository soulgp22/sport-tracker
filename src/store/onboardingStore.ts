import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';

export type OnboardingGoal = 'muscle' | 'strength' | 'weight_loss' | 'fitness';
export type OnboardingLevel = 'beginner' | 'intermediate' | 'advanced';
export type OnboardingGym = 'home' | 'commercial' | 'other';
// L'identifiant correspond à une entrée foodDatabases du manifeste GitHub.
// Les anciennes valeurs `auchan` et `carrefour` restent migrées à la lecture.
export type OnboardingRetailer = string;

export interface OnboardingProfile {
  goal: OnboardingGoal;
  level: OnboardingLevel;
  daysPerWeek: number;
  gym: OnboardingGym;
  retailer: OnboardingRetailer;
}

interface OnboardingState {
  completed: boolean;
  hasHydrated: boolean;
  profile: OnboardingProfile;
  updateProfile: (patch: Partial<OnboardingProfile>) => void;
  complete: () => void;
  restart: () => void;
}

const initialProfile: OnboardingProfile = {
  goal: 'fitness',
  level: 'beginner',
  daysPerWeek: 3,
  gym: 'commercial',
  retailer: 'none',
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      hasHydrated: false,
      profile: initialProfile,
      updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
      complete: () => set({ completed: true }),
      restart: () => set({ completed: false, profile: initialProfile }),
    }),
    {
      name: 'onboarding-store-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({ completed: state.completed, profile: state.profile }),
    }
  )
);

// Zustand n'expose pas l'hydratation dans l'état : ce hook synchronise le routeur
// sans afficher brièvement l'accueil avant l'onboarding.
useOnboardingStore.persist.onFinishHydration(() => {
  useOnboardingStore.setState({ hasHydrated: true });
});
if (useOnboardingStore.persist.hasHydrated()) {
  useOnboardingStore.setState({ hasHydrated: true });
}
