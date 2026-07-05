import type { CatalogExercise } from '../types';

export const muscleFr: Record<string, string> = {
  abdominals: 'Abdominaux',
  abductors: 'Abducteurs',
  adductors: 'Adducteurs',
  biceps: 'Biceps',
  calves: 'Mollets',
  chest: 'Pectoraux',
  forearms: 'Avant-bras',
  glutes: 'Fessiers',
  hamstrings: 'Ischio-jambiers',
  lats: 'Grand dorsal',
  'lower back': 'Lombaires',
  'middle back': 'Milieu du dos',
  neck: 'Cou',
  other: 'Autre',
  quadriceps: 'Quadriceps',
  shoulders: 'Épaules',
  traps: 'Trapèzes',
  triceps: 'Triceps',
};

export const equipmentFr: Record<string, string> = {
  bands: 'Élastiques',
  barbell: 'Barre',
  'body only': 'Poids du corps',
  cable: 'Poulie',
  dumbbell: 'Haltères',
  'e-z curl bar': 'Barre EZ',
  'exercise ball': 'Swiss ball',
  'foam roll': 'Rouleau',
  kettlebell: 'Kettlebell',
  kettlebells: 'Kettlebell',
  machine: 'Machine',
  'medicine ball': 'Médecine-ball',
  other: 'Autre',
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function capitalizeFallback(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function translateMuscle(value: string | null | undefined) {
  if (!value) return '';
  return muscleFr[normalizeKey(value)] ?? capitalizeFallback(value);
}

export function translateEquipment(value: string | null | undefined) {
  if (!value) return '';
  return equipmentFr[normalizeKey(value)] ?? capitalizeFallback(value);
}

export function getExerciseDisplayName(exercise: Pick<CatalogExercise, 'name' | 'nameFr'>) {
  return exercise.nameFr?.trim() || exercise.name;
}

export function getExerciseDisplayInstructions(
  exercise: Pick<CatalogExercise, 'instructions' | 'instructionsFr'>
) {
  return exercise.instructionsFr && exercise.instructionsFr.length > 0
    ? exercise.instructionsFr
    : exercise.instructions;
}
