import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REST_TIMER_CHANNEL_ID = 'rest-timer';

let scheduledRestEndNotificationId: string | null = null;

const restEndNotificationContent: Notifications.NotificationContentInput = {
  title: 'Repos terminé',
  body: "Temps de repos écoulé, c'est reparti !",
  sound: 'default',
};

export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(REST_TIMER_CHANNEL_ID, {
        name: 'Timer de repos',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
      });
    } catch {
      // Notification setup should never block the rest timer itself.
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
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

export async function scheduleRestEndNotification(fireDate: Date): Promise<void> {
  if (fireDate.getTime() <= Date.now()) {
    await cancelRestEndNotification();
    return;
  }

  await cancelRestEndNotification();

  try {
    scheduledRestEndNotificationId = await Notifications.scheduleNotificationAsync({
      content: restEndNotificationContent,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: REST_TIMER_CHANNEL_ID,
      },
    });
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
    } catch {
      scheduledRestEndNotificationId = null;
    }
  }
}

export async function cancelRestEndNotification(): Promise<void> {
  if (!scheduledRestEndNotificationId) {
    return;
  }

  const notificationId = scheduledRestEndNotificationId;
  scheduledRestEndNotificationId = null;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // The notification may already have fired or been removed by the OS.
  }
}
