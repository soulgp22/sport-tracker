import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  cancelRestEndNotification,
  dismissOngoingRestTimerNotification,
  presentOngoingRestTimerNotification,
  requestNotificationPermission,
  scheduleRestEndNotification,
  updateOngoingRestTimerNotification,
} from '../lib/restTimerNotifications';
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
  const scheduledNotificationIdRef = useRef<string | null>(null);
  const notificationGenerationRef = useRef(0);

  useEffect(() => {
    if (restTimerActive) {
      const initialSeconds = getRemainingRestSeconds(useActiveSessionStore.getState().active);
      void presentOngoingRestTimerNotification(initialSeconds);

      intervalRef.current = setInterval(() => {
        const seconds = getRemainingRestSeconds(useActiveSessionStore.getState().active);
        if (seconds <= 3 && lastHapticSecondRef.current !== seconds) {
          lastHapticSecondRef.current = seconds;
          void playRestHaptic(seconds);
        }
        syncRestTimer();
        void updateOngoingRestTimerNotification(seconds);
      }, 1000);
    } else {
      lastHapticSecondRef.current = null;
      void dismissOngoingRestTimerNotification();
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
    const generation = ++notificationGenerationRef.current;

    if (!restTimerActive || !restEndsAt) {
      const notificationId = scheduledNotificationIdRef.current;
      scheduledNotificationIdRef.current = null;
      void cancelRestEndNotification(notificationId);
      return;
    }

    const fireDate = new Date(restEndsAt);

    if (Number.isNaN(fireDate.getTime()) || fireDate.getTime() <= Date.now()) {
      const notificationId = scheduledNotificationIdRef.current;
      scheduledNotificationIdRef.current = null;
      void cancelRestEndNotification(notificationId);
      return;
    }

    let cancelled = false;
    void (async () => {
      const granted = await requestNotificationPermission();
      if (granted && !cancelled) {
        const notificationId = await scheduleRestEndNotification(fireDate);
        if (cancelled || notificationGenerationRef.current !== generation) {
          await cancelRestEndNotification(notificationId);
        } else {
          scheduledNotificationIdRef.current = notificationId;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restEndsAt, restTimerActive]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        syncRestTimer();

        const active = useActiveSessionStore.getState().active;
        if (active?.restTimerActive && active.restEndsAt) {
          const fireDate = new Date(active.restEndsAt);
          if (fireDate.getTime() > Date.now()) {
            void (async () => {
              const granted = await requestNotificationPermission();
              if (granted) {
                scheduledNotificationIdRef.current =
                  await scheduleRestEndNotification(fireDate);
              }
            })();
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [syncRestTimer]);

  return { startTimer: setTimer, addRestSeconds, skipRest, clearTimer };
}
