import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';

export type OnboardingGoal = 'muscle' | 'strength' | 'weight_loss' | 'fitness';
export type OnboardingLevel = 'beginner' | 'intermediate' | 'advanced';
export type OnboardingEquipmentProfileId =
  | 'bodyweight'
  | 'home-basic'
  | 'dumbbells'
  | 'machines'
  | 'barbell'
  | 'full-gym';
// L'identifiant correspond à une base pays (ou historique par enseigne) du manifeste GitHub.
// Les anciennes valeurs `auchan` et `carrefour` restent migrées à la lecture.
export type OnboardingRetailer = string;

export interface OnboardingProfile {
  goal: OnboardingGoal;
  level: OnboardingLevel;
  daysPerWeek: number;
  equipmentProfileId: OnboardingEquipmentProfileId;
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
  equipmentProfileId: 'full-gym',
  retailer: 'none',
};

const ONBOARDING_EQUIPMENT_PROFILES: OnboardingEquipmentProfileId[] = [
  'bodyweight',
  'home-basic',
  'dumbbells',
  'machines',
  'barbell',
  'full-gym',
];

function migrateLegacyGym(
  legacy: unknown
): OnboardingEquipmentProfileId | undefined {
  if (typeof legacy !== 'string') return undefined;
  // Anciennes valeurs du onboarding "salle" ; tout est migré vers full-gym par défaut.
  if (legacy === 'home') return 'bodyweight';
  if (legacy === 'commercial' || legacy === 'other') return 'full-gym';
  if (ONBOARDING_EQUIPMENT_PROFILES.includes(legacy as OnboardingEquipmentProfileId)) {
    return legacy as OnboardingEquipmentProfileId;
  }
  return undefined;
}

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
      merge: (persisted, current) => {
        const saved = persisted as Partial<OnboardingState>;
        const savedProfile = saved.profile;
        const migratedProfile: OnboardingProfile = {
          ...initialProfile,
          ...(savedProfile ?? {}),
        };
        if (savedProfile) {
          const legacyGym = (savedProfile as unknown as Record<string, unknown>).gym;
          const legacyEquipment = (savedProfile as OnboardingProfile).equipmentProfileId;
          const migratedEquipment = migrateLegacyGym(legacyGym ?? legacyEquipment);
          if (migratedEquipment) {
            migratedProfile.equipmentProfileId = migratedEquipment;
          }
        }
        return { ...current, profile: migratedProfile };
      },
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
