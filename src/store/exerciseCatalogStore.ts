import { create } from 'zustand';

import {
  getExerciseDisplayName,
  getExerciseSearchAliases,
  translateEquipment,
  translateMuscle,
} from '../constants/exerciseI18n';
import catalogJson from '../data/exercises.catalog.json';
import type { CatalogExercise } from '../types';

const catalog = catalogJson as CatalogExercise[];

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
const byName = new Map<string, CatalogExercise>();
for (const exercise of catalog) {
  byName.set(normalize(exercise.name), exercise);
  if (exercise.nameFr) byName.set(normalize(exercise.nameFr), exercise);
}
const bodyParts = [...new Set(catalog.map((exercise) => exercise.bodyPart))].sort();
const equipments = [...new Set(catalog.map((exercise) => exercise.equipment))].sort();

interface ExerciseCatalogState {
  exercises: CatalogExercise[];
  bodyParts: string[];
  equipments: string[];
  all: () => CatalogExercise[];
  getById: (id: string) => CatalogExercise | undefined;
  findByName: (name: string) => CatalogExercise | undefined;
  search: (query: string) => CatalogExercise[];
  filterByMuscle: (bodyPart: string) => CatalogExercise[];
}

export const useExerciseCatalogStore = create<ExerciseCatalogState>()((_, get) => ({
  exercises: catalog,
  bodyParts,
  equipments,
  all: () => get().exercises,
  getById: (id) => byId.get(id),
  findByName: (name) => byName.get(normalize(name)),
  search: (query) => {
    const term = normalize(query);
    if (!term) return get().exercises;
    return get().exercises.filter((exercise) => {
      const haystack = normalize(
        [
          exercise.name,
          exercise.nameFr,
          exercise.bodyPart,
          exercise.target,
          exercise.equipment,
          ...exercise.secondaryMuscles,
          ...getExerciseSearchAliases(exercise.id),
          ...(['fr', 'en', 'es', 'de'] as const).flatMap((language) => [
            translateMuscle(exercise.bodyPart, language),
            translateMuscle(exercise.target, language),
            translateEquipment(exercise.equipment, language),
            ...exercise.secondaryMuscles.map((muscle) => translateMuscle(muscle, language)),
          ]),
        ]
          .filter(Boolean)
          .join(' ')
      );
      return haystack.includes(term);
    });
  },
  filterByMuscle: (bodyPart) => {
    if (!bodyPart) return get().exercises;
    return get().exercises.filter((exercise) => exercise.bodyPart === bodyPart);
  },
}));

export function getCatalogExercise(id: string) {
  return byId.get(id);
}

export function findCatalogExerciseByName(name: string) {
  return byName.get(normalize(name));
}

export function getCatalogExerciseName(id: string, fallback = 'Exercice') {
  const exercise = byId.get(id);
  return exercise ? getExerciseDisplayName(exercise) : fallback;
}

export function normalizeExerciseName(name: string) {
  return normalize(name);
}
