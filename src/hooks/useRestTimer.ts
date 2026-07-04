import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useActiveSessionStore } from '../store/activeSessionStore';

export function useRestTimer() {
  const restTimerActive = useActiveSessionStore((s) => s.active?.restTimerActive ?? false);
  const syncRestTimer = useActiveSessionStore((s) => s.syncRestTimer);
  const setTimer = useActiveSessionStore((s) => s.setRestTimer);
  const clearTimer = useActiveSessionStore((s) => s.clearRestTimer);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (restTimerActive) {
      intervalRef.current = setInterval(syncRestTimer, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restTimerActive, syncRestTimer]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        syncRestTimer();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [syncRestTimer]);

  return { startTimer: setTimer, clearTimer };
}
