import { getRemainingRestSeconds, useActiveSessionStore } from '../activeSessionStore';
import { useSessionStore } from '../sessionStore';
import { useExerciseCatalogStore } from '../exerciseCatalogStore';
import type { Program, ProgramDay, Session } from '../../types';

const CATALOG = useExerciseCatalogStore.getState().all();
const SWAP_FROM = CATALOG[0];
const SWAP_TO_WITH_HISTORY = CATALOG[1];
const SWAP_TO_WITHOUT_HISTORY = CATALOG[2];

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
      alternativeExerciseIds: ['ex3'],
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

const makeSwapDay = (): ProgramDay => ({
  id: 'day-swap',
  name: 'Swap',
  order: 0,
  exercises: [
    {
      id: 'pe-swap',
      exerciseId: SWAP_FROM.id,
      exerciseName: SWAP_FROM.name,
      alternativeExerciseIds: [SWAP_TO_WITH_HISTORY.id, SWAP_TO_WITHOUT_HISTORY.id],
      order: 0,
      sets: [
        { reps: 10, weight: 60, restSeconds: 90 },
        { reps: 8, weight: 70, restSeconds: 120 },
      ],
    },
  ],
});

const makeSession = (id: string, exerciseId: string, weights: number[], date: string): Session => ({
  id,
  programId: 'prog1',
  programDayId: 'day1',
  programName: 'PPL',
  dayName: 'Push',
  date,
  durationSeconds: 3600,
  exercises: [
    {
      exerciseId,
      exerciseName: 'Bench Press',
      sets: weights.map((weight) => ({
        targetReps: 10,
        targetWeight: weight,
        targetRestSeconds: 90,
        actualReps: 10,
        actualWeight: weight,
        completed: true,
        completedAt: date,
      })),
    },
  ],
});

beforeEach(() => {
  useActiveSessionStore.setState({ active: null });
  useSessionStore.setState({ sessions: [] });
});

describe('startSession', () => {
  it('initializes active session with correct structure and falls back to program weights without history', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    const active = useActiveSessionStore.getState().active!;
    expect(active.programName).toBe('PPL');
    expect(active.dayName).toBe('Push');
    expect(active.currentExerciseIndex).toBe(0);
    expect(active.currentSetIndex).toBe(0);
    expect(active.exercises).toHaveLength(2);
    expect(active.exercises[0].sets).toHaveLength(2);
    expect(active.exercises[0].sets[0].completed).toBe(false);
    expect(active.exercises[0].alternativeExerciseIds).toEqual(['ex3']);
    // Pre-filled with targets
    expect(active.exercises[0].sets[0].actualReps).toBe(10);
    expect(active.exercises[0].sets[0].targetWeight).toBe(60);
    expect(active.exercises[0].sets[0].actualWeight).toBe(60);
    expect(active.exercises[0].sets[1].targetWeight).toBe(70);
    expect(active.exercises[0].sets[1].actualWeight).toBe(70);
    expect(active.exercises[1].sets[0].targetWeight).toBe(40);
    expect(active.exercises[1].sets[0].actualWeight).toBe(40);
    expect(active.restTimerActive).toBe(false);
  });

  it('uses the latest logged weights for the same exercise', () => {
    useSessionStore.setState({
      sessions: [
        makeSession('newer', 'ex1', [82.5, 87.5], '2026-02-02T00:00:00.000Z'),
        makeSession('older', 'ex1', [75, 80], '2026-02-01T00:00:00.000Z'),
      ],
    });

    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());

    const sets = useActiveSessionStore.getState().active!.exercises[0].sets;
    expect(sets[0].targetWeight).toBe(82.5);
    expect(sets[0].actualWeight).toBe(82.5);
    expect(sets[1].targetWeight).toBe(87.5);
    expect(sets[1].actualWeight).toBe(87.5);
  });

  it('uses the last available logged set when history has fewer sets than the current program', () => {
    useSessionStore.setState({
      sessions: [makeSession('previous', 'ex1', [77.5], '2026-02-02T00:00:00.000Z')],
    });

    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());

    const sets = useActiveSessionStore.getState().active!.exercises[0].sets;
    expect(sets[0].targetWeight).toBe(77.5);
    expect(sets[0].actualWeight).toBe(77.5);
    expect(sets[1].targetWeight).toBe(77.5);
    expect(sets[1].actualWeight).toBe(77.5);
  });
});

describe('swapExercise', () => {
  it('swaps exercise id and name, keeps alternatives, preserves completed sets, and uses history for pending sets', () => {
    useSessionStore.setState({
      sessions: [
        makeSession(
          'previous',
          SWAP_TO_WITH_HISTORY.id,
          [42.5, 47.5],
          '2026-02-02T00:00:00.000Z'
        ),
      ],
    });

    useActiveSessionStore.getState().startSession(makeProgram(), makeSwapDay());
    useActiveSessionStore.getState().logSet(0, 0, 12, 61);
    useActiveSessionStore.getState().swapExercise(0, SWAP_TO_WITH_HISTORY.id);

    const exercise = useActiveSessionStore.getState().active!.exercises[0];
    expect(exercise.exerciseId).toBe(SWAP_TO_WITH_HISTORY.id);
    expect(exercise.exerciseName).toBe(SWAP_TO_WITH_HISTORY.nameFr ?? SWAP_TO_WITH_HISTORY.name);
    expect(exercise.alternativeExerciseIds).toEqual([
      SWAP_TO_WITH_HISTORY.id,
      SWAP_TO_WITHOUT_HISTORY.id,
    ]);
    expect(exercise.sets[0].completed).toBe(true);
    expect(exercise.sets[0].actualReps).toBe(12);
    expect(exercise.sets[0].targetWeight).toBe(60);
    expect(exercise.sets[0].actualWeight).toBe(61);
    expect(exercise.sets[1].completed).toBe(false);
    expect(exercise.sets[1].targetWeight).toBe(47.5);
    expect(exercise.sets[1].actualWeight).toBe(47.5);
  });

  it('keeps current pending weights when the replacement exercise has no history', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeSwapDay());
    useActiveSessionStore.getState().swapExercise(0, SWAP_TO_WITHOUT_HISTORY.id);

    const exercise = useActiveSessionStore.getState().active!.exercises[0];
    expect(exercise.exerciseId).toBe(SWAP_TO_WITHOUT_HISTORY.id);
    expect(exercise.exerciseName).toBe(SWAP_TO_WITHOUT_HISTORY.nameFr ?? SWAP_TO_WITHOUT_HISTORY.name);
    expect(exercise.sets[0].targetWeight).toBe(60);
    expect(exercise.sets[0].actualWeight).toBe(60);
    expect(exercise.sets[1].targetWeight).toBe(70);
    expect(exercise.sets[1].actualWeight).toBe(70);
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

  it('upserts the active session into history without duplicating it and removes it on cancel', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    const activeId = useActiveSessionStore.getState().active!.id;

    useActiveSessionStore.getState().logSet(0, 0, 12, 65);

    let sessions = useSessionStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(activeId);
    expect(sessions[0].exercises[0].sets[0].actualReps).toBe(12);
    expect(sessions[0].exercises[0].sets[0].actualWeight).toBe(65);
    expect(sessions[0].exercises[0].sets[0].completed).toBe(true);

    useActiveSessionStore.getState().logSet(0, 1, 8, 70);

    sessions = useSessionStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(activeId);
    expect(sessions[0].exercises[0].sets[1].actualReps).toBe(8);
    expect(sessions[0].exercises[0].sets[1].actualWeight).toBe(70);
    expect(sessions[0].exercises[0].sets[1].completed).toBe(true);

    useActiveSessionStore.getState().cancelSession();

    expect(useSessionStore.getState().sessions).toEqual([]);
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
  const now = new Date('2026-03-01T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets rest timer with a future deadline', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    const active = useActiveSessionStore.getState().active!;

    expect(active.restTimerActive).toBe(true);
    expect(active.restEndsAt).toBe(new Date(now.getTime() + 90_000).toISOString());
  });

  it('returns remaining rest seconds from the deadline', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);

    jest.setSystemTime(new Date(now.getTime() + 30_000));

    expect(getRemainingRestSeconds(useActiveSessionStore.getState().active)).toBe(60);
  });

  it('keeps timer active when syncing before the deadline', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    const restEndsAt = useActiveSessionStore.getState().active!.restEndsAt;

    jest.setSystemTime(new Date(now.getTime() + 30_000));
    useActiveSessionStore.getState().syncRestTimer();

    const active = useActiveSessionStore.getState().active!;
    expect(active.restTimerActive).toBe(true);
    expect(active.restEndsAt).toBe(restEndsAt);
  });

  it('deactivates timer when syncing once the deadline has passed', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);

    jest.setSystemTime(new Date(now.getTime() + 90_000));
    useActiveSessionStore.getState().syncRestTimer();

    const active = useActiveSessionStore.getState().active!;
    expect(active.restTimerActive).toBe(false);
    expect(active.restEndsAt).toBeNull();
    expect(getRemainingRestSeconds(active)).toBe(0);
  });

  it('clears rest timer', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    useActiveSessionStore.getState().clearRestTimer();
    expect(useActiveSessionStore.getState().active!.restTimerActive).toBe(false);
    expect(useActiveSessionStore.getState().active!.restEndsAt).toBeNull();
  });

  it('does nothing when clearing timer with no active session', () => {
    expect(() => useActiveSessionStore.getState().clearRestTimer()).not.toThrow();
  });

  it('does nothing when syncing timer with no active session', () => {
    expect(() => useActiveSessionStore.getState().syncRestTimer()).not.toThrow();
  });

  it('addRestSeconds with positive delta increases remaining rest time', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);

    useActiveSessionStore.getState().addRestSeconds(30);

    const active = useActiveSessionStore.getState().active!;
    expect(active.restTimerActive).toBe(true);
    expect(active.restEndsAt).toBe(new Date(now.getTime() + 120_000).toISOString());
    expect(getRemainingRestSeconds(active)).toBe(120);
  });

  it('addRestSeconds with negative delta reduces remaining rest time', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);

    jest.setSystemTime(new Date(now.getTime() + 10_000));
    useActiveSessionStore.getState().addRestSeconds(-10);

    const active = useActiveSessionStore.getState().active!;
    expect(active.restTimerActive).toBe(true);
    // original restEndsAt = now+90s, subtract 10s from the deadline → now+80s
    expect(active.restEndsAt).toBe(new Date(now.getTime() + 80_000).toISOString());
    expect(getRemainingRestSeconds(active)).toBe(70);
  });

  it('addRestSeconds clears timer when adjusted time falls at or below now (clamped at 0)', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);

    // Advance time so only 5s remain, then subtract more than 5s
    jest.setSystemTime(new Date(now.getTime() + 85_000));
    useActiveSessionStore.getState().addRestSeconds(-30);

    const active = useActiveSessionStore.getState().active!;
    expect(active.restTimerActive).toBe(false);
    expect(active.restEndsAt).toBeNull();
    expect(getRemainingRestSeconds(active)).toBe(0);
  });

  it('addRestSeconds does nothing when no rest timer is active', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    // No setRestTimer called → restTimerActive is false, restEndsAt is null

    useActiveSessionStore.getState().addRestSeconds(30);

    const active = useActiveSessionStore.getState().active!;
    expect(active.restTimerActive).toBe(false);
    expect(active.restEndsAt).toBeNull();
  });

  it('skipRest disables rest timer immediately', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    expect(useActiveSessionStore.getState().active!.restTimerActive).toBe(true);

    useActiveSessionStore.getState().skipRest();

    const active = useActiveSessionStore.getState().active!;
    expect(active.restTimerActive).toBe(false);
    expect(active.restEndsAt).toBeNull();
    expect(getRemainingRestSeconds(active)).toBe(0);
  });

  it('skipRest does nothing when no active session', () => {
    expect(() => useActiveSessionStore.getState().skipRest()).not.toThrow();
  });
});

describe('finishSession', () => {
  it('creates a Session and clears active', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    const activeId = useActiveSessionStore.getState().active!.id;
    useActiveSessionStore.getState().logSet(0, 0, 10, 60);
    const session = useActiveSessionStore.getState().finishSession();
    expect(session).not.toBeNull();
    expect(session!.id).toBe(activeId);
    expect(session!.programId).toBe('prog1');
    expect(session!.dayName).toBe('Push');
    expect(session!.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(session!.exercises).toHaveLength(2);
    expect(session!.exercises[0].sets[0].completed).toBe(true);
    expect(useActiveSessionStore.getState().active).toBeNull();
    expect(useSessionStore.getState().sessions).toHaveLength(1);
    expect(useSessionStore.getState().sessions[0]).toEqual(session);
  });

  it('returns null when no active session', () => {
    expect(useActiveSessionStore.getState().finishSession()).toBeNull();
  });
});

describe('cancelSession', () => {
  it('clears active session', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().logSet(0, 0, 10, 60);
    expect(useSessionStore.getState().sessions).toHaveLength(1);

    useActiveSessionStore.getState().cancelSession();

    expect(useActiveSessionStore.getState().active).toBeNull();
    expect(useSessionStore.getState().sessions).toEqual([]);
  });

  it('does nothing when no active session', () => {
    expect(() => useActiveSessionStore.getState().cancelSession()).not.toThrow();
  });
});

describe('rest timer minimize / restore consistency', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers({ now });
    useActiveSessionStore.setState({ active: null });
    useSessionStore.setState({ sessions: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('getRemainingRestSeconds uses absolute restEndsAt timestamp — no drift after minimize', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);

    // Simulate 30s passing
    jest.setSystemTime(new Date(now.getTime() + 30_000));

    const beforeMinimize = getRemainingRestSeconds(useActiveSessionStore.getState().active);

    // Minimize the modal (should not affect remaining time)
    useActiveSessionStore.getState().minimizeRestTimer();
    const midMinimize = getRemainingRestSeconds(useActiveSessionStore.getState().active);

    // Advance another 10s while minimized
    jest.setSystemTime(new Date(now.getTime() + 40_000));

    const afterTimePass = getRemainingRestSeconds(useActiveSessionStore.getState().active);

    // Restore
    useActiveSessionStore.getState().restoreRestTimer();
    const afterRestore = getRemainingRestSeconds(useActiveSessionStore.getState().active);

    // Before minimize: 90 - 30 = 60s remaining
    expect(beforeMinimize).toBe(60);
    // At minimize time: same timestamp, same value
    expect(midMinimize).toBe(60);
    // After 10 more seconds: 60 - 10 = 50s remaining
    expect(afterTimePass).toBe(50);
    // After restore: still 50s (no reset, no drift)
    expect(afterRestore).toBe(50);

    // Verify the end timestamp hasn't changed
    expect(useActiveSessionStore.getState().active!.restEndsAt).toBe(
      new Date(now.getTime() + 90_000).toISOString()
    );
  });

  it('minimizeRestTimer sets restTimerMinimized to true, restoreRestTimer sets to false', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(60);

    expect(useActiveSessionStore.getState().active!.restTimerMinimized).toBe(false);

    useActiveSessionStore.getState().minimizeRestTimer();
    expect(useActiveSessionStore.getState().active!.restTimerMinimized).toBe(true);

    useActiveSessionStore.getState().restoreRestTimer();
    expect(useActiveSessionStore.getState().active!.restTimerMinimized).toBe(false);
  });

  it('clearRestTimer resets restTimerMinimized to false', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(60);
    useActiveSessionStore.getState().minimizeRestTimer();
    expect(useActiveSessionStore.getState().active!.restTimerMinimized).toBe(true);

    useActiveSessionStore.getState().clearRestTimer();
    expect(useActiveSessionStore.getState().active!.restTimerMinimized).toBe(false);
  });
});
