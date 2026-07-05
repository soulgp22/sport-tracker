import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { Program, Exercise, ProgramDay, ProgramExercise, ImportResult } from '../types';
import {
  findCatalogExerciseByName,
  getCatalogExercise,
  getCatalogExerciseName,
} from './exerciseCatalogStore';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

interface ImportPayloadProgram {
  name?: string;
  days?: ImportPayloadDay[];
}

interface ImportPayloadDay {
  name?: string;
  exercises?: ImportPayloadExercise[];
}

interface ImportPayloadExercise {
  exerciseId?: string;
  exerciseName?: string;
  alternativeExerciseIds?: string[];
  alternativeExerciseNames?: string[];
  sets?: ImportPayloadSet[];
}

interface ImportPayloadSet {
  reps?: number;
  weight?: number;
  restSeconds?: number;
}

function parseAndValidateImport(jsonString: string): ImportPayloadProgram[] | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return 'Le fichier n\'est pas un JSON valide.';
  }

  if (!parsed || typeof parsed !== 'object') {
    return 'Format de fichier invalide.';
  }

  if (Array.isArray(parsed)) {
    return parsed as ImportPayloadProgram[];
  }

  const root = parsed as Record<string, unknown>;
  if (!root.version || typeof root.version !== 'number') {
    return 'Version du fichier manquante.';
  }
  if (root.version > 1) {
    return `Version ${root.version} non supportée. Veuillez mettre à jour l'application.`;
  }

  const programs = root.programs;
  if (!Array.isArray(programs) || programs.length === 0) {
    return 'Aucun programme trouvé dans le fichier.';
  }

  return programs as ImportPayloadProgram[];
}

function emptyImportResult(errors: string[] = []): ImportResult {
  return {
    importedPrograms: 0,
    importedExercises: 0,
    unknownExercises: [],
    skipped: 0,
    errors,
  };
}

interface ProgramState {
  programs: Program[];
  exercises: Exercise[];

  addProgram: (name: string) => Program;
  updateProgram: (id: string, patch: Partial<Pick<Program, 'name' | 'days'>>) => void;
  deleteProgram: (id: string) => void;

  addDay: (programId: string, name: string) => ProgramDay;
  updateDay: (programId: string, dayId: string, patch: Partial<Pick<ProgramDay, 'name' | 'exercises'>>) => void;
  deleteDay: (programId: string, dayId: string) => void;

  addExerciseToDay: (programId: string, dayId: string, exercise: Omit<ProgramExercise, 'id' | 'order'>) => void;
  updateExerciseInDay: (programId: string, dayId: string, exerciseId: string, patch: Partial<ProgramExercise>) => void;
  deleteExerciseFromDay: (programId: string, dayId: string, exerciseId: string) => void;

  addExercise: (name: string, muscleGroup?: string) => Exercise;
  updateExercise: (id: string, patch: Partial<Omit<Exercise, 'id'>>) => void;

  importPrograms: (jsonString: string, options?: { commit?: boolean }) => ImportResult;
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set, get) => ({
      programs: [],
      exercises: [],

      addProgram: (name) => {
        const now = new Date().toISOString();
        const program: Program = { id: uid(), name, days: [], createdAt: now, updatedAt: now };
        set((s) => ({ programs: [...s.programs, program] }));
        return program;
      },

      updateProgram: (id, patch) => {
        set((s) => ({
          programs: s.programs.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deleteProgram: (id) => {
        set((s) => ({ programs: s.programs.filter((p) => p.id !== id) }));
      },

      addDay: (programId, name) => {
        const day: ProgramDay = {
          id: uid(),
          name,
          exercises: [],
          order: get().programs.find((p) => p.id === programId)?.days.length ?? 0,
        };
        set((s) => ({
          programs: s.programs.map((p) =>
            p.id === programId
              ? { ...p, days: [...p.days, day], updatedAt: new Date().toISOString() }
              : p
          ),
        }));
        return day;
      },

      updateDay: (programId, dayId, patch) => {
        set((s) => ({
          programs: s.programs.map((p) =>
            p.id === programId
              ? {
                  ...p,
                  days: p.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      deleteDay: (programId, dayId) => {
        set((s) => ({
          programs: s.programs.map((p) =>
            p.id === programId
              ? {
                  ...p,
                  days: p.days.filter((d) => d.id !== dayId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      addExerciseToDay: (programId, dayId, exercise) => {
        const program = get().programs.find((p) => p.id === programId);
        const day = program?.days.find((d) => d.id === dayId);
        const newEx: ProgramExercise = { ...exercise, id: uid(), order: day?.exercises.length ?? 0 };
        set((s) => ({
          programs: s.programs.map((p) =>
            p.id === programId
              ? {
                  ...p,
                  days: p.days.map((d) =>
                    d.id === dayId ? { ...d, exercises: [...d.exercises, newEx] } : d
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      updateExerciseInDay: (programId, dayId, exerciseId, patch) => {
        set((s) => ({
          programs: s.programs.map((p) =>
            p.id === programId
              ? {
                  ...p,
                  days: p.days.map((d) =>
                    d.id === dayId
                      ? {
                          ...d,
                          exercises: d.exercises.map((e) =>
                            e.id === exerciseId ? { ...e, ...patch } : e
                          ),
                        }
                      : d
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      deleteExerciseFromDay: (programId, dayId, exerciseId) => {
        set((s) => ({
          programs: s.programs.map((p) =>
            p.id === programId
              ? {
                  ...p,
                  days: p.days.map((d) =>
                    d.id === dayId
                      ? { ...d, exercises: d.exercises.filter((e) => e.id !== exerciseId) }
                      : d
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      addExercise: (name, muscleGroup) => {
        const ex: Exercise = { id: uid(), name, muscleGroup };
        set((s) => ({ exercises: [...s.exercises, ex] }));
        return ex;
      },

      updateExercise: (id, patch) => {
        set((s) => ({
          exercises: s.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
      },

      importPrograms: (jsonString, options) => {
        const commit = options?.commit ?? true;
        const result = parseAndValidateImport(jsonString);
        if (typeof result === 'string') {
          return emptyImportResult([result]);
        }

        const imported: Program[] = [];
        const errors: string[] = [];
        const unknownExercises = new Set<string>();
        let importedExercises = 0;
        let skipped = 0;

        for (let i = 0; i < result.length; i++) {
          const p = result[i];
          if (!p.name || !p.name.trim()) {
            errors.push(`Programme #${i + 1} : nom manquant.`);
            skipped += 1;
            continue;
          }

          const days: ProgramDay[] = (p.days ?? []).map((d, di) => {
            const exercises: ProgramExercise[] = [];

            for (const ex of d.exercises ?? []) {
              const catalogExercise =
                (ex.exerciseId ? getCatalogExercise(ex.exerciseId) : undefined) ??
                (ex.exerciseName ? findCatalogExerciseByName(ex.exerciseName) : undefined);

              if (!catalogExercise) {
                unknownExercises.add(ex.exerciseName ?? ex.exerciseId ?? `Exercice inconnu #${exercises.length + 1}`);
                skipped += 1;
                continue;
              }

              const alternativeExerciseIds = new Set<string>();
              const importedAlternativeIds = Array.isArray(ex.alternativeExerciseIds)
                ? ex.alternativeExerciseIds
                : [];
              const importedAlternativeNames = Array.isArray(ex.alternativeExerciseNames)
                ? ex.alternativeExerciseNames
                : [];

              for (const alternativeId of importedAlternativeIds) {
                if (typeof alternativeId !== 'string') continue;
                const alternative = getCatalogExercise(alternativeId);
                if (alternative && alternative.id !== catalogExercise.id) {
                  alternativeExerciseIds.add(alternative.id);
                }
              }

              for (const alternativeName of importedAlternativeNames) {
                if (typeof alternativeName !== 'string') continue;
                const alternative = findCatalogExerciseByName(alternativeName);
                if (alternative && alternative.id !== catalogExercise.id) {
                  alternativeExerciseIds.add(alternative.id);
                }
              }

              exercises.push({
                id: uid(),
                exerciseId: catalogExercise.id,
                exerciseName: getCatalogExerciseName(catalogExercise.id, catalogExercise.name),
                ...(alternativeExerciseIds.size > 0
                  ? { alternativeExerciseIds: [...alternativeExerciseIds] }
                  : {}),
                sets: (ex.sets ?? []).map((s) => ({
                  reps: s.reps ?? 10,
                  weight: s.weight ?? 0,
                  restSeconds: s.restSeconds ?? 90,
                })),
                order: exercises.length,
              });
              importedExercises += 1;
            }

            return {
              id: uid(),
              name: d.name ?? `Jour ${di + 1}`,
              exercises,
              order: di,
            };
          });

          imported.push({
            id: uid(),
            name: p.name.trim(),
            days,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        if (commit && imported.length > 0) {
          set((s) => ({ programs: [...s.programs, ...imported] }));
        }

        return {
          importedPrograms: imported.length,
          importedExercises,
          unknownExercises: [...unknownExercises],
          skipped,
          errors,
        };
      },
    }),
    {
      name: 'programs-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
    }
  )
);
