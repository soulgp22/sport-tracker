import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  getExerciseDisplayName,
  getExerciseSearchAliases,
  translateEquipment,
  translateMuscle,
} from '../constants/exerciseI18n';
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

interface ExerciseCatalogState {
  exercises: CatalogExercise[];
  downloadedExercises: CatalogExercise[];
  installedPackIds: string[];
  bodyParts: string[];
  equipments: string[];
  all: () => CatalogExercise[];
  getById: (id: string) => CatalogExercise | undefined;
  findByName: (name: string) => CatalogExercise | undefined;
  search: (query: string) => CatalogExercise[];
  filterByMuscle: (bodyPart: string) => CatalogExercise[];
  installPack: (packId: string, exercises: CatalogExercise[]) => number;
}

function dimensions(exercises: CatalogExercise[]) {
  return {
    bodyParts: [...new Set(exercises.map((exercise) => exercise.bodyPart))].sort(),
    equipments: [...new Set(exercises.map((exercise) => exercise.equipment))].sort(),
  };
}

export const useExerciseCatalogStore = create<ExerciseCatalogState>()(
  persist(
    (set, get) => ({
      exercises: coreCatalog,
      downloadedExercises: [],
      installedPackIds: [],
      ...dimensions(coreCatalog),
      all: () => get().exercises,
      getById: (id) => byId.get(id),
      findByName: (name) => byName.get(normalize(name)),
      search: (query) => {
        const term = normalize(query);
        if (!term) return get().exercises;
        return get().exercises.filter((exercise) => normalize([
          exercise.name, exercise.nameFr, exercise.bodyPart, exercise.target, exercise.equipment,
          ...exercise.secondaryMuscles, ...getExerciseSearchAliases(exercise.id),
          ...(['fr', 'en', 'es', 'de'] as const).flatMap((language) => [
            translateMuscle(exercise.bodyPart, language), translateMuscle(exercise.target, language),
            translateEquipment(exercise.equipment, language),
            ...exercise.secondaryMuscles.map((muscle) => translateMuscle(muscle, language)),
          ]),
        ].filter(Boolean).join(' ')).includes(term));
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
export function normalizeExerciseName(name: string) { return normalize(name); }
