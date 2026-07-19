import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Channel versioning strategy:
 * Android notification channels cannot be updated after creation.
 * To apply a new vibration pattern or importance level, we bump the
 * channel identifier so the OS creates a fresh channel.
 */
const REST_TIMER_CHANNEL_ID = 'rest-timer-v3';
const REST_TIMER_NOTIFICATION_KIND = 'rest-timer-end';

/**
 * Stable identifiers used as NotificationRequestInput identifiers.
 * Scheduling a new notification with the same identifier REPLACES
 * any previous scheduled or presented notification with that identifier
 * in the system tray (both pending and displayed).
 */
const REST_TIMER_END_ID = 'rest-timer-end';
const ONGOING_TIMER_ID = 'rest-timer-ongoing';

/**
 * Stronger vibration pattern (ms): 0 initial pause, 600ms vibrate,
 * 300ms pause, 600ms vibrate. The longer duration provides a more
 * noticeable haptic effect than the default system vibration.
 */
const STRONG_VIBRATION_PATTERN = [0, 600, 300, 600];

let scheduledRestEndNotificationId: string | null = null;
let ongoingNotificationId: string | null = null;
let notificationOperation: Promise<void> = Promise.resolve();
let handlerConfigured = false;

const restEndNotificationContent: Notifications.NotificationContentInput = {
  title: 'Repos terminé',
  body: "Temps de repos écoulé, c'est reparti !",
  sound: 'default',
  priority: 'max',
  interruptionLevel: 'timeSensitive',
  vibrate: STRONG_VIBRATION_PATTERN,
  data: { kind: REST_TIMER_NOTIFICATION_KIND },
};

export async function configureNotifications(): Promise<void> {
  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL_ID, {
        name: 'Fin du temps de repos',
        description: 'Alertes prioritaires à la fin des temps de repos',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: STRONG_VIBRATION_PATTERN,
        enableLights: true,
        lightColor: '#1677FF',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: false,
      });
    } catch {
      // Notification setup should never block the rest timer itself.
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await configureNotifications();
    const existingPermissions = await Notifications.getPermissionsAsync();
    const existingPermissionGranted =
      existingPermissions.granted ||
      existingPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (existingPermissionGranted) {
      return true;
    }

    const requestedPermissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: false,
      },
    });

    return (
      requestedPermissions.granted ||
      requestedPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

function runNotificationOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = notificationOperation.then(operation, operation);
  notificationOperation = result.then(() => undefined, () => undefined);
  return result;
}

async function cancelRestEndNotificationInternal(notificationId?: string | null): Promise<void> {
  const notificationIds = new Set<string>();
  if (notificationId) {
    notificationIds.add(notificationId);
    if (scheduledRestEndNotificationId === notificationId) {
      scheduledRestEndNotificationId = null;
    }
  } else {
    if (scheduledRestEndNotificationId) notificationIds.add(scheduledRestEndNotificationId);

    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      for (const request of scheduledNotifications) {
        if (request.content.data?.kind === REST_TIMER_NOTIFICATION_KIND) {
          notificationIds.add(request.identifier);
        }
      }
    } catch {
      // The known in-memory identifier is still cancelled below when available.
    }

    scheduledRestEndNotificationId = null;
  }

  await Promise.all(
    [...notificationIds].map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // The notification may already have fired or been removed by the OS.
      }
    })
  );
}

export function scheduleRestEndNotification(fireDate: Date): Promise<string | null> {
  return runNotificationOperation(async () => {
    await configureNotifications();
    await cancelRestEndNotificationInternal();

    if (!Number.isFinite(fireDate.getTime()) || fireDate.getTime() <= Date.now()) {
      return null;
    }

    const dateTrigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: REST_TIMER_CHANNEL_ID,
    };

    try {
      const nextTriggerDate = await Notifications.getNextTriggerDateAsync(dateTrigger);
      if (nextTriggerDate === null) throw new Error('Invalid notification trigger');

      scheduledRestEndNotificationId = await Notifications.scheduleNotificationAsync({
        identifier: REST_TIMER_END_ID,
        content: restEndNotificationContent,
        trigger: dateTrigger,
      });
      return scheduledRestEndNotificationId;
    } catch {
      const remainingSeconds = Math.max(1, Math.ceil((fireDate.getTime() - Date.now()) / 1000));

      try {
        scheduledRestEndNotificationId = await Notifications.scheduleNotificationAsync({
          identifier: REST_TIMER_END_ID,
          content: restEndNotificationContent,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: remainingSeconds,
            repeats: false,
            channelId: REST_TIMER_CHANNEL_ID,
          },
        });
        return scheduledRestEndNotificationId;
      } catch {
        scheduledRestEndNotificationId = null;
        return null;
      }
    }
  });
}

export function cancelRestEndNotification(notificationId?: string | null): Promise<void> {
  return runNotificationOperation(() => cancelRestEndNotificationInternal(notificationId));
}

export async function hasScheduledRestEndNotification(): Promise<boolean> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    return scheduledNotifications.some(
      (request) => request.content.data?.kind === REST_TIMER_NOTIFICATION_KIND
    );
  } catch {
    return scheduledRestEndNotificationId !== null;
  }
}

// ──────────────────────────────────────────────
// Persistent (ongoing) countdown notification
// ──────────────────────────────────────────────
// With Expo v56, true live-updating notifications (auto-decrementing
// countdown in the tray) are NOT possible without a custom native module.
// The best available approach:
//   1. Present a notification with sticky=true (Android ongoing flag)
//      so it cannot be dismissed by the user.
//   2. Periodically cancel and reschedule it with the updated remaining
//      time. This gives the appearance of a live countdown, albeit with
//      a brief flicker on each update.
//   3. Dismiss it when the timer ends or is cancelled.
//
// Limitations to be aware of:
//   - Updates only happen as fast as the JS timer fires (~1 s).
//   - If the app is killed, the notification stays at its last value
//     and won't update further (no native foreground service).
//   - On iOS, the sticky flag is ignored (iOS doesn't support ongoing).
//
// This is the BEST we can do in pure Expo v56 without ejecting.

function buildOngoingNotificationContent(seconds: number): Notifications.NotificationContentInput {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return {
    title: '⏱ Repos',
    body: `${mm}:${ss} restant`,
    sound: false,
    priority: 'max',
    sticky: true,
    data: { kind: 'rest-timer-ongoing' },
  };
}

export async function presentOngoingRestTimerNotification(seconds: number): Promise<void> {
  return runNotificationOperation(async () => {
    await configureNotifications();
    try {
      // Cancel/dismiss directly without going through runNotificationOperation
      // to avoid a deadlock (runNotificationOperation serializes operations).
      try {
        await Notifications.cancelScheduledNotificationAsync(ONGOING_TIMER_ID);
      } catch {
        try {
          await Notifications.dismissNotificationAsync(ONGOING_TIMER_ID);
        } catch {
          // Ignore.
        }
      }
      const id = await Notifications.scheduleNotificationAsync({
        identifier: ONGOING_TIMER_ID,
        content: buildOngoingNotificationContent(seconds),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
          channelId: REST_TIMER_CHANNEL_ID,
        },
      });
      ongoingNotificationId = id;
    } catch {
      // Continue without ongoing notification.
    }
  });
}

export async function updateOngoingRestTimerNotification(seconds: number): Promise<void> {
  if (ongoingNotificationId === null) {
    await presentOngoingRestTimerNotification(seconds);
    return;
  }
  return runNotificationOperation(async () => {
    try {
      await Notifications.cancelScheduledNotificationAsync(ONGOING_TIMER_ID);
    } catch {
      // May already be presented; try dismissing it.
      try {
        await Notifications.dismissNotificationAsync(ONGOING_TIMER_ID);
      } catch {
        // Ignore.
      }
    }
    try {
      const id = await Notifications.scheduleNotificationAsync({
        identifier: ONGOING_TIMER_ID,
        content: buildOngoingNotificationContent(seconds),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
          repeats: false,
          channelId: REST_TIMER_CHANNEL_ID,
        },
      });
      ongoingNotificationId = id;
    } catch {
      ongoingNotificationId = null;
    }
  });
}

export async function dismissOngoingRestTimerNotification(): Promise<void> {
  return runNotificationOperation(async () => {
    try {
      await Notifications.cancelScheduledNotificationAsync(ONGOING_TIMER_ID);
    } catch {
      // Ignore.
    }
    try {
      await Notifications.dismissNotificationAsync(ONGOING_TIMER_ID);
    } catch {
      // Ignore.
    }
    ongoingNotificationId = null;
  });
}
