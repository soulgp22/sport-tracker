import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { cancelRestEndNotification, scheduleRestEndNotification } from '../lib/restTimerNotifications';
import { getRemainingRestSeconds, useActiveSessionStore } from '../store/activeSessionStore';

async function playRestHaptic(seconds: number): Promise<void> {
  try {
    if (seconds === 0) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (seconds <= 3) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics are an enhancement and must never block timer updates.
  }
}

export function useRestTimer() {
  const restTimerActive = useActiveSessionStore((s) => s.active?.restTimerActive ?? false);
  const restEndsAt = useActiveSessionStore((s) => s.active?.restEndsAt ?? null);
  const syncRestTimer = useActiveSessionStore((s) => s.syncRestTimer);
  const setTimer = useActiveSessionStore((s) => s.setRestTimer);
  const addRestSeconds = useActiveSessionStore((s) => s.addRestSeconds);
  const skipRest = useActiveSessionStore((s) => s.skipRest);
  const clearTimer = useActiveSessionStore((s) => s.clearRestTimer);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHapticSecondRef = useRef<number | null>(null);

  useEffect(() => {
    if (restTimerActive) {
      intervalRef.current = setInterval(() => {
        const seconds = getRemainingRestSeconds(useActiveSessionStore.getState().active);
        if (seconds <= 3 && lastHapticSecondRef.current !== seconds) {
          lastHapticSecondRef.current = seconds;
          void playRestHaptic(seconds);
        }
        syncRestTimer();
      }, 1000);
    } else {
      lastHapticSecondRef.current = null;
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

  return { startTimer: setTimer, addRestSeconds, skipRest, clearTimer };
}
