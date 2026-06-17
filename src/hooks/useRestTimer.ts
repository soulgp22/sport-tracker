import { useEffect, useRef } from 'react';
import { useActiveSessionStore } from '../store/activeSessionStore';

export function useRestTimer() {
  const restTimerActive = useActiveSessionStore((s) => s.active?.restTimerActive ?? false);
  const tick = useActiveSessionStore((s) => s.tickRestTimer);
  const setTimer = useActiveSessionStore((s) => s.setRestTimer);
  const clearTimer = useActiveSessionStore((s) => s.clearRestTimer);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (restTimerActive) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restTimerActive, tick]);

  return { startTimer: setTimer, clearTimer };
}
