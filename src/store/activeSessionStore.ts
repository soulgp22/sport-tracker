import { create } from 'zustand';
import type { ActiveSession, Program, ProgramDay, Session, SessionExercise } from '../types';
import { getCatalogExerciseName } from './exerciseCatalogStore';
import { useSessionStore } from './sessionStore';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const getLastLoggedWeight = (exerciseId: string, setIndex: number): number | null => {
  const lastSession = useSessionStore.getState().getSessionsForExercise(exerciseId)[0];
  const lastExercise = lastSession?.exercises.find((exercise) => exercise.exerciseId === exerciseId);

  if (!lastExercise || lastExercise.sets.length === 0) {
    return null;
  }

  const matchingSet = lastExercise.sets[setIndex];
  const proposedSet = matchingSet ?? lastExercise.sets[lastExercise.sets.length - 1];

  return typeof proposedSet.actualWeight === 'number' ? proposedSet.actualWeight : null;
};

export const getRemainingRestSeconds = (active: ActiveSession | null): number => {
  if (!active?.restTimerActive || !active.restEndsAt) {
    return 0;
  }

  return Math.max(0, Math.round((new Date(active.restEndsAt).getTime() - Date.now()) / 1000));
};

interface ActiveSessionState {
  active: ActiveSession | null;

  startSession: (program: Program, day: ProgramDay) => void;
  setActivePointer: (exerciseIndex: number, setIndex: number) => void;
  logSet: (exerciseIndex: number, setIndex: number, actualReps: number, actualWeight: number) => void;
  swapExercise: (exerciseIndex: number, newExerciseId: string) => void;
  setRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;
  syncRestTimer: () => void;
  finishSession: () => Session | null;
  cancelSession: () => void;
}

export const useActiveSessionStore = create<ActiveSessionState>()((set, get) => ({
  active: null,

  startSession: (program, day) => {
    const exercises: SessionExercise[] = day.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: getCatalogExerciseName(ex.exerciseId, ex.exerciseName),
      alternativeExerciseIds: ex.alternativeExerciseIds ? [...ex.alternativeExerciseIds] : undefined,
      sets: ex.sets.map((s, setIndex) => {
        const proposedWeight = getLastLoggedWeight(ex.exerciseId, setIndex) ?? s.weight;

        return {
          targetReps: s.reps,
          targetWeight: proposedWeight,
          targetRestSeconds: s.restSeconds,
          actualReps: s.reps,
          actualWeight: proposedWeight,
          completed: false,
        };
      }),
    }));

    set({
      active: {
        programId: program.id,
        programDayId: day.id,
        programName: program.name,
        dayName: day.name,
        startedAt: new Date().toISOString(),
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises,
        restTimerActive: false,
        restEndsAt: null,
      },
    });
  },

  setActivePointer: (exerciseIndex, setIndex) => {
    set((s) => {
      if (!s.active) return s;
      const ex = s.active.exercises[exerciseIndex];
      if (!ex) return s;
      const si = Math.max(0, Math.min(setIndex, ex.sets.length - 1));
      return { active: { ...s.active, currentExerciseIndex: exerciseIndex, currentSetIndex: si } };
    });
  },

  logSet: (exerciseIndex, setIndex, actualReps, actualWeight) => {
    const { active } = get();
    if (!active) return;

    const exercises = active.exercises.map((ex, ei) =>
      ei !== exerciseIndex
        ? ex
        : {
            ...ex,
            sets: ex.sets.map((s, si) =>
              si !== setIndex
                ? s
                : { ...s, actualReps, actualWeight, completed: true, completedAt: new Date().toISOString() }
            ),
          }
    );

    // Advance pointer
    const currentEx = exercises[exerciseIndex];
    const nextSetIndex = setIndex + 1;
    let nextExerciseIndex = exerciseIndex;
    let nextSet = nextSetIndex;

    if (nextSetIndex >= currentEx.sets.length) {
      nextSet = 0;
      nextExerciseIndex = exerciseIndex + 1;
    }

    set({
      active: {
        ...active,
        exercises,
        currentExerciseIndex: Math.min(nextExerciseIndex, exercises.length - 1),
        currentSetIndex: nextSet,
      },
    });
  },

  swapExercise: (exerciseIndex, newExerciseId) => {
    set((s) => {
      if (!s.active) return s;
      const currentExercise = s.active.exercises[exerciseIndex];
      if (!currentExercise) return s;

      return {
        active: {
          ...s.active,
          exercises: s.active.exercises.map((exercise, ei) =>
            ei !== exerciseIndex
              ? exercise
              : {
                  ...exercise,
                  exerciseId: newExerciseId,
                  exerciseName: getCatalogExerciseName(newExerciseId, exercise.exerciseName),
                  sets: exercise.sets.map((set, setIndex) => {
                    if (set.completed) return set;
                    const proposedWeight = getLastLoggedWeight(newExerciseId, setIndex) ?? set.actualWeight;
                    return {
                      ...set,
                      targetWeight: proposedWeight,
                      actualWeight: proposedWeight,
                    };
                  }),
                }
          ),
        },
      };
    });
  },

  setRestTimer: (seconds) => {
    set((s) =>
      s.active
        ? {
            active: {
              ...s.active,
              restTimerActive: true,
              restEndsAt: new Date(Date.now() + seconds * 1000).toISOString(),
            },
          }
        : s
    );
  },

  clearRestTimer: () => {
    set((s) =>
      s.active ? { active: { ...s.active, restTimerActive: false, restEndsAt: null } } : s
    );
  },

  syncRestTimer: () => {
    set((s) => {
      if (!s.active?.restTimerActive || !s.active.restEndsAt) return s;

      if (Date.now() < new Date(s.active.restEndsAt).getTime()) {
        return s;
      }

      return {
        active: {
          ...s.active,
          restTimerActive: false,
          restEndsAt: null,
        },
      };
    });
  },

  finishSession: () => {
    const { active } = get();
    if (!active) return null;

    const durationSeconds = Math.round(
      (Date.now() - new Date(active.startedAt).getTime()) / 1000
    );

    const session: Session = {
      id: uid(),
      programId: active.programId,
      programDayId: active.programDayId,
      programName: active.programName,
      dayName: active.dayName,
      date: active.startedAt,
      durationSeconds,
      exercises: active.exercises,
    };

    set({ active: null });
    return session;
  },

  cancelSession: () => {
    set({ active: null });
  },
}));
