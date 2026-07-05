import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { FoodEntry } from '../types';

export type NewFoodEntry = Omit<FoodEntry, 'id'>;
export type FoodEntryPatch = Partial<Omit<FoodEntry, 'id'>>;

interface FoodDiaryState {
  entries: FoodEntry[];
  addFoodEntry: (entry: NewFoodEntry) => FoodEntry;
  updateFoodEntry: (id: string, patch: FoodEntryPatch) => void;
  deleteFoodEntry: (id: string) => void;
  getEntriesByDate: (date: string) => FoodEntry[];
}

function createFoodEntryId() {
  return `food_entry_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function dateKey(date: string) {
  return date.slice(0, 10);
}

export const useFoodDiaryStore = create<FoodDiaryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addFoodEntry: (entry) => {
        const foodEntry = { ...entry, id: createFoodEntryId() };
        set((state) => ({ entries: [foodEntry, ...state.entries] }));
        return foodEntry;
      },

      updateFoodEntry: (id, patch) => {
        set((state) => ({
          entries: state.entries.map((entry) => (entry.id === id ? { ...entry, ...patch, id: entry.id } : entry)),
        }));
      },

      deleteFoodEntry: (id) => {
        set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }));
      },

      getEntriesByDate: (date) => {
        const targetDate = dateKey(date);
        return get().entries.filter((entry) => dateKey(entry.date) === targetDate);
      },
    }),
    {
      name: 'food-diary-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
    }
  )
);
