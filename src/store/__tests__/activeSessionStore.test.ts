import { useActiveSessionStore } from '../activeSessionStore';
import type { Program, ProgramDay } from '../../types';

const makeProgram = (): Program => ({
  id: 'prog1',
  name: 'PPL',
  days: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const makeDay = (): ProgramDay => ({
  id: 'day1',
  name: 'Push',
  order: 0,
  exercises: [
    {
      id: 'pe1',
      exerciseId: 'ex1',
      exerciseName: 'Bench Press',
      order: 0,
      sets: [
        { reps: 10, weight: 60, restSeconds: 90 },
        { reps: 8, weight: 70, restSeconds: 120 },
      ],
    },
    {
      id: 'pe2',
      exerciseId: 'ex2',
      exerciseName: 'OHP',
      order: 1,
      sets: [{ reps: 8, weight: 40, restSeconds: 90 }],
    },
  ],
});

beforeEach(() => {
  useActiveSessionStore.setState({ active: null });
});

describe('startSession', () => {
  it('initializes active session with correct structure', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    const active = useActiveSessionStore.getState().active!;
    expect(active.programName).toBe('PPL');
    expect(active.dayName).toBe('Push');
    expect(active.currentExerciseIndex).toBe(0);
    expect(active.currentSetIndex).toBe(0);
    expect(active.exercises).toHaveLength(2);
    expect(active.exercises[0].sets).toHaveLength(2);
    expect(active.exercises[0].sets[0].completed).toBe(false);
    // Pre-filled with targets
    expect(active.exercises[0].sets[0].actualReps).toBe(10);
    expect(active.exercises[0].sets[0].actualWeight).toBe(60);
    expect(active.restTimerActive).toBe(false);
  });
});

describe('logSet', () => {
  it('logs a set and marks it completed', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().logSet(0, 0, 12, 65);
    const active = useActiveSessionStore.getState().active!;
    expect(active.exercises[0].sets[0].actualReps).toBe(12);
    expect(active.exercises[0].sets[0].actualWeight).toBe(65);
    expect(active.exercises[0].sets[0].completed).toBe(true);
    expect(active.exercises[0].sets[0].completedAt).toBeDefined();
  });

  it('advances to next set within same exercise', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().logSet(0, 0, 10, 60);
    expect(useActiveSessionStore.getState().active!.currentSetIndex).toBe(1);
    expect(useActiveSessionStore.getState().active!.currentExerciseIndex).toBe(0);
  });

  it('advances to next exercise when sets are exhausted', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().logSet(0, 0, 10, 60);
    useActiveSessionStore.getState().logSet(0, 1, 8, 70);
    expect(useActiveSessionStore.getState().active!.currentExerciseIndex).toBe(1);
    expect(useActiveSessionStore.getState().active!.currentSetIndex).toBe(0);
  });

  it('stays at last set index when all exercises are done', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    // Complete all 2 sets of exercise 0
    useActiveSessionStore.getState().logSet(0, 0, 10, 60);
    useActiveSessionStore.getState().logSet(0, 1, 8, 70);
    // Complete the 1 set of exercise 1
    useActiveSessionStore.getState().logSet(1, 0, 8, 40);
    const active = useActiveSessionStore.getState().active!;
    expect(active.currentExerciseIndex).toBe(1);
    expect(active.currentSetIndex).toBe(0);
  });

  it('does nothing when no active session', () => {
    expect(() => useActiveSessionStore.getState().logSet(0, 0, 10, 50)).not.toThrow();
  });
});

describe('rest timer', () => {
  it('sets rest timer', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    expect(useActiveSessionStore.getState().active!.restTimerActive).toBe(true);
    expect(useActiveSessionStore.getState().active!.restSecondsRemaining).toBe(90);
  });

  it('ticks rest timer down', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(3);
    useActiveSessionStore.getState().tickRestTimer();
    expect(useActiveSessionStore.getState().active!.restSecondsRemaining).toBe(2);
  });

  it('deactivates timer when it reaches 0', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(1);
    useActiveSessionStore.getState().tickRestTimer();
    expect(useActiveSessionStore.getState().active!.restSecondsRemaining).toBe(0);
    expect(useActiveSessionStore.getState().active!.restTimerActive).toBe(false);
  });

  it('does not go below 0', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(0);
    useActiveSessionStore.getState().tickRestTimer();
    expect(useActiveSessionStore.getState().active!.restSecondsRemaining).toBe(0);
  });

  it('does not tick when timer is not active', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().tickRestTimer();
    expect(useActiveSessionStore.getState().active!.restSecondsRemaining).toBe(0);
  });

  it('clears rest timer', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    useActiveSessionStore.getState().clearRestTimer();
    expect(useActiveSessionStore.getState().active!.restTimerActive).toBe(false);
    expect(useActiveSessionStore.getState().active!.restSecondsRemaining).toBe(0);
  });

  it('does nothing when clearing timer with no active session', () => {
    expect(() => useActiveSessionStore.getState().clearRestTimer()).not.toThrow();
  });
});

describe('finishSession', () => {
  it('creates a Session and clears active', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().logSet(0, 0, 10, 60);
    const session = useActiveSessionStore.getState().finishSession();
    expect(session).not.toBeNull();
    expect(session!.programId).toBe('prog1');
    expect(session!.dayName).toBe('Push');
    expect(session!.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(session!.exercises).toHaveLength(2);
    expect(session!.exercises[0].sets[0].completed).toBe(true);
    expect(useActiveSessionStore.getState().active).toBeNull();
  });

  it('returns null when no active session', () => {
    expect(useActiveSessionStore.getState().finishSession()).toBeNull();
  });
});

describe('cancelSession', () => {
  it('clears active session', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().cancelSession();
    expect(useActiveSessionStore.getState().active).toBeNull();
  });

  it('does nothing when no active session', () => {
    expect(() => useActiveSessionStore.getState().cancelSession()).not.toThrow();
  });
});
