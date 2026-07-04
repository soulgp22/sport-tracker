import { renderHook, act, cleanup } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
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

const now = new Date('2026-03-01T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers({ now });
  useActiveSessionStore.setState({ active: null });
});

afterEach(async () => {
  useActiveSessionStore.setState({ active: null });
  await cleanup();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('startTimer calls setRestTimer on the store', async () => {
  useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
  const { result } = renderHook(() => useRestTimer());
  // RTL v14 renderHook uses useEffect internally — flush to populate result.current
  await act(async () => {});

  await act(async () => {
    result.current!.startTimer(60);
  });
  expect(useActiveSessionStore.getState().active!.restEndsAt).toBe(
    new Date(now.getTime() + 60_000).toISOString()
  );
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
  expect(useActiveSessionStore.getState().active!.restEndsAt).toBeNull();
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

it('syncs expired rest timer on the interval', async () => {
  useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
  useActiveSessionStore.getState().setRestTimer(1);
  renderHook(() => useRestTimer());
  await act(async () => {});

  await act(async () => {
    jest.advanceTimersByTime(1000);
  });

  const active = useActiveSessionStore.getState().active!;
  expect(active.restTimerActive).toBe(false);
  expect(active.restEndsAt).toBeNull();
});

it('syncs immediately when the app returns to the foreground', async () => {
  const remove = jest.fn();
  let listener: ((state: AppStateStatus) => void) | undefined;
  const addEventListenerSpy = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_eventType, callback) => {
      listener = callback;
      return { remove } as ReturnType<typeof AppState.addEventListener>;
    });

  useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
  useActiveSessionStore.getState().setRestTimer(1);
  const { unmount } = renderHook(() => useRestTimer());
  await act(async () => {});

  expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));

  jest.setSystemTime(new Date(now.getTime() + 1000));
  await act(async () => {
    listener?.('active');
  });

  const active = useActiveSessionStore.getState().active!;
  expect(active.restTimerActive).toBe(false);
  expect(active.restEndsAt).toBeNull();

  unmount();
  expect(remove).toHaveBeenCalled();
});
