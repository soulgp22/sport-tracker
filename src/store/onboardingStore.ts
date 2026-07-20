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
// Les anciennes valeurs uchan et carrefour restent migrées à la lecture.
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

const VALID_GOALS: readonly OnboardingGoal[] = [
  'muscle',
  'strength',
  'weight_loss',
  'fitness',
];

const VALID_LEVELS: readonly OnboardingLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
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

/**
 * safeProfile : construit un profil valide depuis une valeur stockée.
 * Valide chaque champ individuellement ; tout champ invalide ou absent
 * retombe sur la valeur initiale. Gère aussi le champ historique gym.
 * Cette fonction ne doit jamais lever.
 */
function safeProfile(persistedProfile: unknown): OnboardingProfile {
  const profile: OnboardingProfile = { ...initialProfile };

  if (!persistedProfile || typeof persistedProfile !== 'object') {
    return profile;
  }

  const src = persistedProfile as Record<string, unknown>;

  // Valider goal
  if (typeof src.goal === 'string' && (VALID_GOALS as readonly string[]).includes(src.goal)) {
    profile.goal = src.goal as OnboardingGoal;
  }

  // Valider level
  if (typeof src.level === 'string' && (VALID_LEVELS as readonly string[]).includes(src.level)) {
    profile.level = src.level as OnboardingLevel;
  }

  // Valider daysPerWeek (nombre entre 0 et 7)
  if (typeof src.daysPerWeek === 'number' && src.daysPerWeek >= 0 && src.daysPerWeek <= 7) {
    profile.daysPerWeek = src.daysPerWeek;
  }

  // Valider equipmentProfileId
  if (
    typeof src.equipmentProfileId === 'string' &&
    (ONBOARDING_EQUIPMENT_PROFILES as readonly string[]).includes(src.equipmentProfileId)
  ) {
    profile.equipmentProfileId = src.equipmentProfileId as OnboardingEquipmentProfileId;
  }

  // Valider retailer (toute chaîne est acceptée)
  if (typeof src.retailer === 'string') {
    profile.retailer = src.retailer;
  }

  // Migration du champ historique gym (prioritaire sur equipmentProfileId)
  if (src.gym !== undefined) {
    const legacy = migrateLegacyGym(src.gym);
    if (legacy !== undefined) {
      profile.equipmentProfileId = legacy;
    }
  }

  return profile;
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
        // Couche 1 — merge ne doit JAMAIS lever
        try {
          // Si persisted n'est pas un objet non-nul, retourner un état valide
          if (!persisted || typeof persisted !== 'object') {
            return {
              ...current,
              completed: false,
              profile: { ...initialProfile },
            };
          }

          const saved = persisted as Record<string, unknown>;

          // Construire le profil de manière défensive (valide chaque champ)
          const profile = safeProfile(saved.profile);

          return {
            ...current,
            completed: typeof saved.completed === 'boolean' ? saved.completed : false,
            profile,
          };
        } catch {
          // Filet ultime : ne jamais propager d'exception
          return {
            ...current,
            completed: false,
            profile: { ...initialProfile },
          };
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
