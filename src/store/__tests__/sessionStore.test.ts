import { useSessionStore } from '../sessionStore';
import type { Session } from '../../types';

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 's1',
  date: '2026-06-17T10:00:00.000Z',
  durationSeconds: 3600,
  exercises: [
    {
      exerciseId: 'ex1',
      exerciseName: 'Bench Press',
      sets: [
        { targetReps: 10, targetWeight: 60, targetRestSeconds: 90, actualReps: 10, actualWeight: 60, completed: true },
      ],
    },
  ],
  ...overrides,
});

beforeEach(() => {
  useSessionStore.setState({ sessions: [] });
});

describe('sessions', () => {
  it('adds a session at the beginning of the list', () => {
    const s1 = makeSession({ date: '2026-01-01T00:00:00.000Z' });
    const s2 = makeSession({ date: '2026-06-01T00:00:00.000Z' });
    useSessionStore.getState().addSession(s1);
    useSessionStore.getState().addSession(s2);
    expect(useSessionStore.getState().sessions).toHaveLength(2);
    expect(useSessionStore.getState().sessions[0].date).toBe('2026-06-01T00:00:00.000Z');
  });

  it('deletes a session', () => {
    useSessionStore.getState().addSession(makeSession());
    useSessionStore.getState().deleteSession('s1');
    expect(useSessionStore.getState().sessions).toHaveLength(0);
  });

  it('upserts a new session at the beginning of the list', () => {
    const session = makeSession({ id: 's2' });

    useSessionStore.getState().upsertSession(session);

    expect(useSessionStore.getState().sessions).toEqual([session]);
  });

  it('replaces an existing session without moving it', () => {
    const first = makeSession({ id: 's1', date: '2026-01-01T00:00:00.000Z' });
    const existing = makeSession({ id: 's2', date: '2026-02-01T00:00:00.000Z' });
    const updated = makeSession({
      id: 's2',
      date: '2026-03-01T00:00:00.000Z',
      durationSeconds: 120,
    });

    useSessionStore.setState({ sessions: [first, existing] });
    useSessionStore.getState().upsertSession(updated);

    expect(useSessionStore.getState().sessions).toEqual([first, updated]);
  });

  it('handles delete of non-existent session without error', () => {
    useSessionStore.getState().deleteSession('nonexistent');
    expect(useSessionStore.getState().sessions).toHaveLength(0);
  });
});

describe('getSessionsForExercise', () => {
  it('returns sessions containing the given exercise', () => {
    useSessionStore.getState().addSession(
      makeSession({
        exercises: [
          { exerciseId: 'ex1', exerciseName: 'Bench Press', sets: [] },
          { exerciseId: 'ex2', exerciseName: 'OHP', sets: [] },
        ],
      })
    );
    useSessionStore.getState().addSession(
      makeSession({ id: 's2', exercises: [{ exerciseId: 'ex2', exerciseName: 'OHP', sets: [] }] })
    );

    const result = useSessionStore.getState().getSessionsForExercise('ex2');
    expect(result).toHaveLength(2);

    const result2 = useSessionStore.getState().getSessionsForExercise('ex1');
    expect(result2).toHaveLength(1);
  });

  it('returns empty array for exercise never logged', () => {
    useSessionStore.getState().addSession(makeSession());
    const result = useSessionStore.getState().getSessionsForExercise('unknown');
    expect(result).toEqual([]);
  });
});
