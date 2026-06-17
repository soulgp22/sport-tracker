import { create } from 'zustand';
import type { ActiveSession, Program, ProgramDay, Session, SessionExercise } from '../types';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

interface ActiveSessionState {
  active: ActiveSession | null;

  startSession: (program: Program, day: ProgramDay) => void;
  logSet: (exerciseIndex: number, setIndex: number, actualReps: number, actualWeight: number) => void;
  setRestTimer: (seconds: number) => void;
  tickRestTimer: () => void;
  clearRestTimer: () => void;
  finishSession: () => Session | null;
  cancelSession: () => void;
}

export const useActiveSessionStore = create<ActiveSessionState>()((set, get) => ({
  active: null,

  startSession: (program, day) => {
    const exercises: SessionExercise[] = day.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      sets: ex.sets.map((s) => ({
        targetReps: s.reps,
        targetWeight: s.weight,
        targetRestSeconds: s.restSeconds,
        actualReps: s.reps,
        actualWeight: s.weight,
        completed: false,
      })),
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
        restSecondsRemaining: 0,
      },
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

  setRestTimer: (seconds) => {
    set((s) =>
      s.active ? { active: { ...s.active, restTimerActive: true, restSecondsRemaining: seconds } } : s
    );
  },

  tickRestTimer: () => {
    set((s) => {
      if (!s.active || !s.active.restTimerActive) return s;
      const remaining = s.active.restSecondsRemaining - 1;
      return {
        active: {
          ...s.active,
          restSecondsRemaining: Math.max(0, remaining),
          restTimerActive: remaining > 0,
        },
      };
    });
  },

  clearRestTimer: () => {
    set((s) =>
      s.active ? { active: { ...s.active, restTimerActive: false, restSecondsRemaining: 0 } } : s
    );
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
