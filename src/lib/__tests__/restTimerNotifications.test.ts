import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  configureNotifications,
  dismissOngoingRestTimerNotification,
  presentOngoingRestTimerNotification,
  scheduleRestEndNotification,
} from '../restTimerNotifications';

const now = new Date('2026-03-01T12:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('restTimerNotifications – notification replacement', () => {
  it('uses the stable identifier "rest-timer-end" so new notifications replace old ones', async () => {
    await configureNotifications();

    const futureDate = new Date(now.getTime() + 90_000);
    await scheduleRestEndNotification(futureDate);

    // Verify the first call used the stable identifier
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'rest-timer-end',
      })
    );

    // Schedule a second notification at a different time
    const laterDate = new Date(now.getTime() + 180_000);
    await scheduleRestEndNotification(laterDate);

    // Both calls use the same identifier → notification replacement
    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    const identifiers = calls.map((call: unknown[]) => (call[0] as { identifier: string }).identifier);
    expect(identifiers).toEqual(['rest-timer-end', 'rest-timer-end']);
  });

  it('presentOngoingRestTimerNotification uses stable identifier "rest-timer-ongoing"', async () => {
    await presentOngoingRestTimerNotification(90);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'rest-timer-ongoing',
      })
    );
  });

  it('dismissOngoingRestTimerNotification cancels and dismisses the ongoing notification', async () => {
    await dismissOngoingRestTimerNotification();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'rest-timer-ongoing'
    );
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith(
      'rest-timer-ongoing'
    );
  });

  it('sets the sticky flag on ongoing countdown notification', async () => {
    await presentOngoingRestTimerNotification(45);

    const callContent = (Notifications.scheduleNotificationAsync as jest.Mock).mock
      .calls[0][0].content;

    expect(callContent.sticky).toBe(true);
    expect(callContent.title).toContain('Repos');
    expect(callContent.body).toContain('00:45');
  });
});
