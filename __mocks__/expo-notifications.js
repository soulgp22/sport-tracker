const AndroidImportance = {
  UNKNOWN: 0,
  UNSPECIFIED: 1,
  NONE: 2,
  MIN: 3,
  LOW: 4,
  DEFAULT: 5,
  HIGH: 6,
  MAX: 7,
};

const IosAuthorizationStatus = {
  NOT_DETERMINED: 0,
  DENIED: 1,
  AUTHORIZED: 2,
  PROVISIONAL: 3,
  EPHEMERAL: 4,
};

const SchedulableTriggerInputTypes = {
  CALENDAR: 'calendar',
  DAILY: 'daily',
  DATE: 'date',
  MONTHLY: 'monthly',
  TIME_INTERVAL: 'timeInterval',
  WEEKLY: 'weekly',
  YEARLY: 'yearly',
};

module.exports = {
  AndroidImportance,
  IosAuthorizationStatus,
  SchedulableTriggerInputTypes,
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'scheduled-notification-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  dismissNotificationAsync: jest.fn(async () => undefined),
  dismissAllNotificationsAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPresentedNotificationsAsync: jest.fn(async () => []),
};
