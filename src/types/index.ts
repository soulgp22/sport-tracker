export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string;
}

export interface CatalogExercise {
  id: string;
  name: string;
  nameFr?: string;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  instructions: string[];
  instructionsFr?: string[];
  gif: { a: string; b: string };
}

export interface ProgramSet {
  reps: number;
  weight: number;
  restSeconds: number;
}

export interface ProgramExercise {
  id: string;
  exerciseId: string; // References CatalogExercise.id
  exerciseName: string; // Compatibility field, derived from the catalog on selection/import
  alternativeExerciseIds?: string[]; // References CatalogExercise.id
  sets: ProgramSet[];
  order: number;
}

export interface ImportResult {
  importedPrograms: number;
  importedExercises: number;
  unknownExercises: string[];
  skipped: number;
  errors: string[];
}

export interface ProgramDay {
  id: string;
  name: string;
  exercises: ProgramExercise[];
  order: number;
}

export interface Program {
  id: string;
  name: string;
  days: ProgramDay[];
  createdAt: string;
  updatedAt: string;
}

export interface LoggedSet {
  targetReps: number;
  targetWeight: number;
  targetRestSeconds: number;
  actualReps: number;
  actualWeight: number;
  completed: boolean;
  completedAt?: string;
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  alternativeExerciseIds?: string[];
  sets: LoggedSet[];
}

export interface Session {
  id: string;
  programId?: string;
  programDayId?: string;
  programName?: string;
  dayName?: string;
  date: string;
  durationSeconds: number;
  exercises: SessionExercise[];
  notes?: string;
}

export interface ActiveSession {
  programId: string;
  programDayId: string;
  programName: string;
  dayName: string;
  startedAt: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  exercises: SessionExercise[];
  restTimerActive: boolean;
  restEndsAt: string | null;
}
