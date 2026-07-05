import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { cancelRestEndNotification, scheduleRestEndNotification } from '../lib/restTimerNotifications';
import { useActiveSessionStore } from '../store/activeSessionStore';

export function useRestTimer() {
  const restTimerActive = useActiveSessionStore((s) => s.active?.restTimerActive ?? false);
  const restEndsAt = useActiveSessionStore((s) => s.active?.restEndsAt ?? null);
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
    if (!restTimerActive || !restEndsAt) {
      void cancelRestEndNotification();
      return;
    }

    const fireDate = new Date(restEndsAt);

    if (Number.isNaN(fireDate.getTime()) || fireDate.getTime() <= Date.now()) {
      void cancelRestEndNotification();
      return;
    }

    void scheduleRestEndNotification(fireDate);
  }, [restEndsAt, restTimerActive]);

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
