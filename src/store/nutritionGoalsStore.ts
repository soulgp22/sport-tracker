import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { NutritionGoals } from '../types';

export const DEFAULT_NUTRITION_GOALS: NutritionGoals = {
  dailyCalories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  goalType: 'maintenance',
};

interface NutritionGoalsState {
  goals: NutritionGoals;
  setGoals: (patch: Partial<NutritionGoals>) => void;
}

export const useNutritionGoalsStore = create<NutritionGoalsState>()(
  persist(
    (set) => ({
      goals: DEFAULT_NUTRITION_GOALS,

      setGoals: (patch) => {
        set((state) => ({ goals: { ...state.goals, ...patch } }));
      },
    }),
    {
      name: 'nutrition-goals-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
    }
  )
);
