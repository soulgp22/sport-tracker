import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  resolveHealthWeightMerge,
  type HealthWeightSample,
} from '../lib/healthWeightMerge';
import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { WeightEntry } from '../types';

interface BodyWeightState {
  entries: WeightEntry[];
  addEntry: (weight: number, date?: string) => WeightEntry;
  deleteEntry: (id: string) => void;
  /**
   * Applique un releve Health Connect selon la regle « le plus recent gagne »
   * (voir `lib/healthWeightMerge`). Renvoie true si l'etat a change, ce qui
   * permet de ne pas ecrire dans le stockage a chaque retour sur l'ecran.
   */
  syncHealthWeight: (sample: HealthWeightSample) => boolean;
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
        const weightEntry: WeightEntry = existing
          ? { ...existing, date, weight, source: 'manual' }
          : { id: createBodyWeightId(), date, weight, source: 'manual' };

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

      syncHealthWeight: (sample) => {
        const decision = resolveHealthWeightMerge(get().entries, sample);
        if (decision.action === 'skip') return false;

        set((state) => ({
          entries: sortByDate(
            decision.action === 'add'
              ? [
                  ...state.entries,
                  {
                    id: createBodyWeightId(),
                    date: decision.date,
                    weight: decision.weight,
                    source: 'healthConnect',
                  },
                ]
              : state.entries.map((entry) =>
                  entry.id === decision.id
                    ? {
                        ...entry,
                        date: decision.date,
                        weight: decision.weight,
                        source: 'healthConnect',
                      }
                    : entry
                )
          ),
        }));

        return true;
      },
    }),
    {
      name: 'body-weight-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
    }
  )
);
