import { renderHook, act, cleanup } from '@testing-library/react-native';
import { useRestTimer } from '../useRestTimer';
import { useActiveSessionStore } from '../../store/activeSessionStore';
import type { Program, ProgramDay } from '../../types';

const makeProgram = (): Program => ({
  id: 'p1', name: 'Test', days: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
});

const makeDay = (): ProgramDay => ({
  id: 'd1', name: 'Day', order: 0,
  exercises: [{
    id: 'e1', exerciseId: 'ex1', exerciseName: 'Bench', order: 0,
    sets: [{ reps: 10, weight: 60, restSeconds: 90 }],
  }],
});

beforeEach(() => {
  useActiveSessionStore.setState({ active: null });
});

afterEach(async () => {
  useActiveSessionStore.setState({ active: null });
  await cleanup();
});

it('startTimer calls setRestTimer on the store', async () => {
  useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
  const { result } = renderHook(() => useRestTimer());
  // RTL v14 renderHook uses useEffect internally — flush to populate result.current
  await act(async () => {});

  await act(async () => {
    result.current!.startTimer(60);
  });
  expect(useActiveSessionStore.getState().active!.restSecondsRemaining).toBe(60);
});

it('clearTimer calls clearRestTimer on the store', async () => {
  useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
  const { result } = renderHook(() => useRestTimer());
  await act(async () => {});

  await act(async () => {
    result.current!.startTimer(60);
  });
  await act(async () => {
    result.current!.clearTimer();
  });
  expect(useActiveSessionStore.getState().active!.restSecondsRemaining).toBe(0);
});

it('startTimer and clearTimer are wired to store actions', async () => {
  useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
  const { result } = renderHook(() => useRestTimer());
  await act(async () => {});

  // startTimer should call setRestTimer
  await act(async () => {
    result.current!.startTimer(90);
  });
  expect(useActiveSessionStore.getState().active!.restTimerActive).toBe(true);

  // clearTimer should call clearRestTimer
  await act(async () => {
    result.current!.clearTimer();
  });
  expect(useActiveSessionStore.getState().active!.restTimerActive).toBe(false);
});
