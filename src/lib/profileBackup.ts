import type {
  Exercise,
  Food,
  FoodEntry,
  NutritionGoals,
  Program,
  Session,
  WeightEntry,
} from '../types';
import { useBodyWeightStore } from '../store/bodyWeightStore';
import { useFoodDiaryStore } from '../store/foodDiaryStore';
import { useFoodStore } from '../store/foodStore';
import { useNutritionGoalsStore } from '../store/nutritionGoalsStore';
import { useProgramStore } from '../store/programStore';
import { useSessionStore } from '../store/sessionStore';

export const PROFILE_BACKUP_VERSION = 1;

export interface ProfileBackupData {
  programs: Program[];
  exercises: Exercise[];
  sessions: Session[];
  customFoods: Food[];
  foodDiaryEntries: FoodEntry[];
  nutritionGoals: NutritionGoals;
  bodyWeightEntries: WeightEntry[];
}

export interface ProfileBackup {
  version: typeof PROFILE_BACKUP_VERSION;
  exportedAt: string;
  data: ProfileBackupData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateNamedItems(items: unknown[], label: string): string | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!isRecord(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.name)) {
      return `${label} #${i + 1} invalide.`;
    }
  }

  return null;
}

function validateDatedItems(items: unknown[], label: string): string | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!isRecord(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.date)) {
      return `${label} #${i + 1} invalide.`;
    }
  }

  return null;
}

function validateSessions(items: unknown[]): string | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.date) ||
      !Array.isArray(item.exercises)
    ) {
      return `Séance #${i + 1} invalide.`;
    }
  }

  return null;
}

function validateNutritionGoals(value: unknown): value is NutritionGoals {
  if (!isRecord(value)) return false;

  return (
    isNumber(value.dailyCalories) &&
    isNumber(value.protein) &&
    isNumber(value.carbs) &&
    isNumber(value.fat) &&
    (value.goalType === 'loss' || value.goalType === 'maintenance' || value.goalType === 'gain')
  );
}

function readArray(data: Record<string, unknown>, key: keyof ProfileBackupData): unknown[] | string {
  const value = data[key];
  return Array.isArray(value) ? value : `Données manquantes ou invalides : ${key}.`;
}

export function buildProfileBackup(): string {
  const programState = useProgramStore.getState();

  const backup: ProfileBackup = {
    version: PROFILE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      programs: programState.programs,
      exercises: programState.exercises,
      sessions: useSessionStore.getState().sessions,
      customFoods: useFoodStore.getState().customFoods,
      foodDiaryEntries: useFoodDiaryStore.getState().entries,
      nutritionGoals: useNutritionGoalsStore.getState().goals,
      bodyWeightEntries: useBodyWeightStore.getState().entries,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export function parseProfileBackup(text: string): ProfileBackup | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return "Le fichier profil n'est pas un JSON valide.";
  }

  if (!isRecord(parsed)) {
    return 'Format de sauvegarde profil invalide.';
  }

  if (parsed.version !== PROFILE_BACKUP_VERSION) {
    return `Version de sauvegarde non supportée : ${String(parsed.version)}.`;
  }

  if (!isNonEmptyString(parsed.exportedAt) || !isRecord(parsed.data)) {
    return 'Format de sauvegarde profil invalide.';
  }

  const data = parsed.data;
  const programs = readArray(data, 'programs');
  const exercises = readArray(data, 'exercises');
  const sessions = readArray(data, 'sessions');
  const customFoods = readArray(data, 'customFoods');
  const foodDiaryEntries = readArray(data, 'foodDiaryEntries');
  const bodyWeightEntries = readArray(data, 'bodyWeightEntries');

  if (typeof programs === 'string') return programs;
  if (typeof exercises === 'string') return exercises;
  if (typeof sessions === 'string') return sessions;
  if (typeof customFoods === 'string') return customFoods;
  if (typeof foodDiaryEntries === 'string') return foodDiaryEntries;
  if (typeof bodyWeightEntries === 'string') return bodyWeightEntries;

  const validators = [
    validateNamedItems(programs, 'Programme'),
    validateNamedItems(exercises, 'Exercice'),
    validateSessions(sessions),
    validateNamedItems(customFoods, 'Aliment personnalisé'),
    validateDatedItems(foodDiaryEntries, 'Entrée alimentaire'),
    validateDatedItems(bodyWeightEntries, 'Entrée de poids'),
  ];
  const itemError = validators.find((value): value is string => typeof value === 'string');
  if (itemError) return itemError;

  if (!validateNutritionGoals(data.nutritionGoals)) {
    return 'Objectifs nutrition invalides.';
  }

  return {
    version: PROFILE_BACKUP_VERSION,
    exportedAt: parsed.exportedAt,
    data: {
      programs: programs as Program[],
      exercises: exercises as Exercise[],
      sessions: sessions as Session[],
      customFoods: customFoods as Food[],
      foodDiaryEntries: foodDiaryEntries as FoodEntry[],
      nutritionGoals: data.nutritionGoals,
      bodyWeightEntries: bodyWeightEntries as WeightEntry[],
    },
  };
}

export function restoreProfileBackup(backup: ProfileBackup): void {
  useProgramStore.setState({
    programs: backup.data.programs,
    exercises: backup.data.exercises,
  });
  useSessionStore.setState({ sessions: backup.data.sessions });
  useFoodStore.setState({ customFoods: backup.data.customFoods });
  useFoodDiaryStore.setState({ entries: backup.data.foodDiaryEntries });
  useNutritionGoalsStore.setState({ goals: backup.data.nutritionGoals });
  useBodyWeightStore.setState({ entries: backup.data.bodyWeightEntries });
}
