import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REST_TIMER_CHANNEL_ID = 'rest-timer-v2';
const REST_TIMER_NOTIFICATION_KIND = 'rest-timer-end';

let scheduledRestEndNotificationId: string | null = null;
let notificationOperation: Promise<void> = Promise.resolve();
let handlerConfigured = false;

const restEndNotificationContent: Notifications.NotificationContentInput = {
  title: 'Repos terminé',
  body: "Temps de repos écoulé, c'est reparti !",
  sound: 'default',
  priority: 'max',
  interruptionLevel: 'timeSensitive',
  vibrate: [0, 250, 180, 300],
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
        vibrationPattern: [0, 250, 180, 300],
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
        content: restEndNotificationContent,
        trigger: dateTrigger,
      });
      return scheduledRestEndNotificationId;
    } catch {
      const remainingSeconds = Math.max(1, Math.ceil((fireDate.getTime() - Date.now()) / 1000));

      try {
        scheduledRestEndNotificationId = await Notifications.scheduleNotificationAsync({
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
