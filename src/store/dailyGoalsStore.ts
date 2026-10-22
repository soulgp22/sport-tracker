import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  ACTIVE_KCAL_GOAL_LIMITS,
  DEFAULT_ACTIVE_KCAL_GOAL,
  DEFAULT_STEPS_GOAL,
  STEPS_GOAL_LIMITS,
  clampGoal,
} from '../lib/dailyGoals';
import { asyncStorageAdapter } from '../storage/storageAdapter';

/**
 * Cibles quotidiennes reglees par l'utilisateur : pas et depense active.
 * L'objectif de seances par semaine reste dans `performanceStore`, qui le
 * portait deja (Parametres, badges, notifications).
 */
interface DailyGoalsState {
  stepsGoal: number;
  activeKcalGoal: number;
  setStepsGoal: (value: number) => void;
  setActiveKcalGoal: (value: number) => void;
}

export const useDailyGoalsStore = create<DailyGoalsState>()(
  persist(
    (set) => ({
      stepsGoal: DEFAULT_STEPS_GOAL,
      activeKcalGoal: DEFAULT_ACTIVE_KCAL_GOAL,
      setStepsGoal: (value) =>
        set({ stepsGoal: clampGoal(value, STEPS_GOAL_LIMITS, DEFAULT_STEPS_GOAL) }),
      setActiveKcalGoal: (value) =>
        set({
          activeKcalGoal: clampGoal(value, ACTIVE_KCAL_GOAL_LIMITS, DEFAULT_ACTIVE_KCAL_GOAL),
        }),
    }),
    {
      name: 'daily-goals-store-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        stepsGoal: state.stepsGoal,
        activeKcalGoal: state.activeKcalGoal,
      }),
      // Merge defensive (reusable_functions.md) : chaque champ restaure
      // explicitement, jamais d'exception, valeur hors bornes ramenee au defaut.
      merge: (persisted, current) => {
        try {
          const saved =
            persisted && typeof persisted === 'object'
              ? (persisted as Record<string, unknown>)
              : {};
          return {
            ...current,
            stepsGoal: clampGoal(saved.stepsGoal, STEPS_GOAL_LIMITS, DEFAULT_STEPS_GOAL),
            activeKcalGoal: clampGoal(
              saved.activeKcalGoal,
              ACTIVE_KCAL_GOAL_LIMITS,
              DEFAULT_ACTIVE_KCAL_GOAL
            ),
          };
        } catch {
          return { ...current, stepsGoal: DEFAULT_STEPS_GOAL, activeKcalGoal: DEFAULT_ACTIVE_KCAL_GOAL };
        }
      },
      onRehydrateStorage: () => () => {},
    }
  )
);
