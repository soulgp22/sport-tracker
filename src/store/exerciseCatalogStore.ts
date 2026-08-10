import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  getExerciseDisplayName,
} from '../constants/exerciseI18n';
import { searchExercises } from '../lib/catalogApi';
import type { CatalogSearchResult } from '../lib/catalogApi';
import coreCatalogJson from '../data/exercises.core.json';
import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { CatalogExercise } from '../types';

const coreCatalog = coreCatalogJson as CatalogExercise[];

function normalize(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

let byId = new Map<string, CatalogExercise>();
let byName = new Map<string, CatalogExercise>();

function rebuildIndexes(exercises: CatalogExercise[]) {
  byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  byName = new Map();
  for (const exercise of exercises) {
    byName.set(normalize(exercise.name), exercise);
    if (exercise.nameFr) byName.set(normalize(exercise.nameFr), exercise);
  }
}

function mergeCatalog(downloaded: CatalogExercise[]) {
  const merged = new Map(coreCatalog.map((exercise) => [exercise.id, exercise]));
  downloaded.forEach((exercise) => merged.set(exercise.id, exercise));
  return [...merged.values()];
}

rebuildIndexes(coreCatalog);

export type SearchError = 'none' | 'unavailable' | 'server-not-configured';

interface ExerciseCatalogState {
  exercises: CatalogExercise[];
  downloadedExercises: CatalogExercise[];
  installedPackIds: string[];
  bodyParts: string[];
  equipments: string[];
  /** Résultats de la dernière recherche réseau. */
  searchResults: CatalogExercise[];
  /** Chargement en cours d'une recherche réseau. */
  searchLoading: boolean;
  /** Erreur de la dernière recherche réseau. */
  searchError: SearchError;
  all: () => CatalogExercise[];
  getById: (id: string) => CatalogExercise | undefined;
  findByName: (name: string) => CatalogExercise | undefined;
  /** Recherche via la passerelle serveur. Met à jour searchResults / searchLoading / searchError. */
  searchAsync: (query: string) => Promise<void>;
  /** Filtrage local par groupe musculaire sur le catalogue complet. */
  filterByMuscle: (bodyPart: string) => CatalogExercise[];
  installPack: (packId: string, exercises: CatalogExercise[]) => number;
}

function dimensions(exercises: CatalogExercise[]) {
  return {
    bodyParts: [...new Set(exercises.map((exercise) => exercise.bodyPart))].sort(),
    equipments: [...new Set(exercises.map((exercise) => exercise.equipment))].sort(),
  };
}

function resultToSearchError(r: CatalogSearchResult<CatalogExercise>): SearchError {
  if (r.kind === 'unavailable') return 'unavailable';
  if (r.kind === 'server-not-configured') return 'server-not-configured';
  return 'none';
}

export const useExerciseCatalogStore = create<ExerciseCatalogState>()(
  persist(
    (set, get) => ({
      exercises: coreCatalog,
      downloadedExercises: [],
      installedPackIds: [],
      ...dimensions(coreCatalog),
      searchResults: [],
      searchLoading: false,
      searchError: 'none' as SearchError,
      all: () => get().exercises,
      getById: (id) => byId.get(id),
      findByName: (name) => byName.get(normalize(name)),
      searchAsync: async (query) => {
        set({ searchLoading: true, searchError: 'none' });
        try {
          const result = await searchExercises(query, 200, 0);
          set({
            searchLoading: false,
            searchError: resultToSearchError(result),
            searchResults: result.kind === 'found' ? result.items : [],
          });
        } catch {
          set({ searchLoading: false, searchError: 'unavailable', searchResults: [] });
        }
      },
      filterByMuscle: (bodyPart) => bodyPart
        ? get().exercises.filter((exercise) => exercise.bodyPart === bodyPart)
        : get().exercises,
      installPack: (packId, incoming) => {
        const valid = incoming.filter((exercise) =>
          typeof exercise.id === 'string' && typeof exercise.name === 'string' &&
          Array.isArray(exercise.instructions) && Array.isArray(exercise.secondaryMuscles)
        );
        const current = new Map(get().downloadedExercises.map((exercise) => [exercise.id, exercise]));
        valid.forEach((exercise) => current.set(exercise.id, exercise));
        const downloadedExercises = [...current.values()];
        const exercises = mergeCatalog(downloadedExercises);
        rebuildIndexes(exercises);
        set({
          downloadedExercises,
          exercises,
          installedPackIds: [...new Set([...get().installedPackIds, packId])],
          ...dimensions(exercises),
        });
        return valid.length;
      },
    }),
    {
      name: 'exercise-catalog-store-v2',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        downloadedExercises: state.downloadedExercises,
        installedPackIds: state.installedPackIds,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<ExerciseCatalogState>;
        const downloadedExercises = saved.downloadedExercises ?? [];
        const exercises = mergeCatalog(downloadedExercises);
        rebuildIndexes(exercises);
        return {
          ...current,
          downloadedExercises,
          installedPackIds: saved.installedPackIds ?? [],
          exercises,
          ...dimensions(exercises),
        };
      },
    }
  )
);

export function getCatalogExercise(id: string) { return byId.get(id); }
export function findCatalogExerciseByName(name: string) { return byName.get(normalize(name)); }
export function getCatalogExerciseName(id: string, fallback = 'Exercice') {
  const exercise = byId.get(id);
  return exercise ? getExerciseDisplayName(exercise) : fallback;
}
