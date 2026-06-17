import { renderHook } from '@testing-library/react-native';
import { useProgressData, useExercisesWithHistory } from '../useProgressData';
import { useSessionStore } from '../../store/sessionStore';
import type { Session } from '../../types';

function addSession(session: Session) {
  useSessionStore.getState().addSession(session);
}

beforeEach(() => {
  useSessionStore.setState({ sessions: [] });
});

describe('useProgressData', () => {
  it('returns empty arrays when no sessions exist', async () => {
    const { result } = renderHook(() => useProgressData('ex1'));
    expect(result.current.maxWeightPoints).toEqual([]);
    expect(result.current.volumePoints).toEqual([]);
  });

  it('computes max weight and volume from completed sets', async () => {
    addSession({
      id: 's1', date: '2026-06-10T10:00:00.000Z', durationSeconds: 1800,
      exercises: [{
        exerciseId: 'ex1', exerciseName: 'Bench Press',
        sets: [
          { targetReps: 10, targetWeight: 60, targetRestSeconds: 90, actualReps: 10, actualWeight: 60, completed: true, completedAt: '2026-06-10T10:00:00.000Z' },
          { targetReps: 8, targetWeight: 65, targetRestSeconds: 90, actualReps: 8, actualWeight: 65, completed: true, completedAt: '2026-06-10T10:00:00.000Z' },
        ],
      }],
    });

    const { result } = renderHook(() => useProgressData('ex1'));
    expect(result.current.maxWeightPoints).toHaveLength(1);
    expect(result.current.maxWeightPoints[0].value).toBe(65);
    expect(result.current.volumePoints[0].value).toBe(10 * 60 + 8 * 65);
  });

  it('ignores uncompleted sets', async () => {
    addSession({
      id: 's1', date: '2026-06-10T10:00:00.000Z', durationSeconds: 1800,
      exercises: [{
        exerciseId: 'ex1', exerciseName: 'Bench Press',
        sets: [
          { targetReps: 10, targetWeight: 60, targetRestSeconds: 90, actualReps: 10, actualWeight: 60, completed: false },
        ],
      }],
    });

    const { result } = renderHook(() => useProgressData('ex1'));
    expect(result.current.maxWeightPoints).toEqual([]);
    expect(result.current.volumePoints).toEqual([]);
  });

  it('sorts chronologically', async () => {
    addSession({
      id: 's2', date: '2026-06-20T10:00:00.000Z', durationSeconds: 1800,
      exercises: [{
        exerciseId: 'ex1', exerciseName: 'Bench Press',
        sets: [{ targetReps: 5, targetWeight: 80, targetRestSeconds: 90, actualReps: 5, actualWeight: 80, completed: true, completedAt: '2026-06-20T10:00:00.000Z' }],
      }],
    });
    addSession({
      id: 's1', date: '2026-06-10T10:00:00.000Z', durationSeconds: 1800,
      exercises: [{
        exerciseId: 'ex1', exerciseName: 'Bench Press',
        sets: [{ targetReps: 10, targetWeight: 60, targetRestSeconds: 90, actualReps: 10, actualWeight: 60, completed: true, completedAt: '2026-06-10T10:00:00.000Z' }],
      }],
    });

    const { result } = renderHook(() => useProgressData('ex1'));
    expect(result.current.maxWeightPoints[0].value).toBe(60);
    expect(result.current.maxWeightPoints[1].value).toBe(80);
  });
});

describe('useExercisesWithHistory', () => {
  it('returns empty when no sessions', async () => {
    const { result } = renderHook(() => useExercisesWithHistory());
    expect(result.current).toEqual([]);
  });

  it('aggregates exercises across sessions', async () => {
    addSession({
      id: 's1', date: '2026-06-10T10:00:00.000Z', durationSeconds: 1800,
      exercises: [
        { exerciseId: 'ex1', exerciseName: 'Bench Press', sets: [] },
        { exerciseId: 'ex2', exerciseName: 'OHP', sets: [] },
      ],
    });
    addSession({
      id: 's2', date: '2026-06-12T10:00:00.000Z', durationSeconds: 1800,
      exercises: [
        { exerciseId: 'ex1', exerciseName: 'Bench Press', sets: [] },
      ],
    });

    const { result } = renderHook(() => useExercisesWithHistory());
    expect(result.current).toHaveLength(2);
    expect(result.current[0].name).toBe('Bench Press');
    expect(result.current[0].sessionCount).toBe(2);
    expect(result.current[1].sessionCount).toBe(1);
  });
});
