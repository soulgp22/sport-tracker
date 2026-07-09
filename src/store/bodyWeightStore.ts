import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { WeightEntry } from '../types';

interface BodyWeightState {
  entries: WeightEntry[];
  addEntry: (weight: number, date?: string) => WeightEntry;
  deleteEntry: (id: string) => void;
}

function createBodyWeightId() {
  return `body_weight_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function dateKey(date: string) {
  return date.slice(0, 10);
}

function sortByDate(entries: WeightEntry[]) {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

export const useBodyWeightStore = create<BodyWeightState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (weight, date = new Date().toISOString()) => {
        const targetDate = dateKey(date);
        const existing = get().entries.find((entry) => dateKey(entry.date) === targetDate);
        const weightEntry = existing
          ? { ...existing, date, weight }
          : { id: createBodyWeightId(), date, weight };

        set((state) => ({
          entries: sortByDate(
            existing
              ? state.entries.map((entry) => (entry.id === existing.id ? weightEntry : entry))
              : [...state.entries, weightEntry]
          ),
        }));

        return weightEntry;
      },

      deleteEntry: (id) => {
        set((state) => ({ entries: state.entries.filter((entry) => entry.id !== id) }));
      },
    }),
    {
      name: 'body-weight-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
    }
  )
);
