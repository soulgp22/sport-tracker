import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import performanceRules from '../config/performance-rules.json';
import { translate, type LanguageId } from '../i18n/translations';
import type { Session, WeightEntry } from '../types';
import type { PerformanceProfile } from '../types/performance';
import {
  analyzeExercisePerformance,
  calculateConsistencyMetrics,
} from './performanceEngine';

const PERFORMANCE_CHANNEL_ID = 'performance-v1';
const PERFORMANCE_NOTIFICATION_ID = 'perf-notification';

export interface PerformanceNotificationInsight {
  kind: 'level' | 'record' | 'close-to-level' | 'weekly-goal';
  title: string;
  body: string;
  exerciseId?: string;
}

interface BuildInsightInput {
  previousSessions: Session[];
  session: Session;
  bodyweightEntries: WeightEntry[];
  profile: PerformanceProfile;
  language: LanguageId;
}

function levelLabel(language: LanguageId, id: string) {
  return translate(language, `performance.level.${id}`);
}

export function buildPerformanceNotificationInsight({
  previousSessions,
  session,
  bodyweightEntries,
  profile,
  language,
}: BuildInsightInput): PerformanceNotificationInsight | undefined {
  const afterSessions = [session, ...previousSessions.filter((item) => item.id !== session.id)];
  let bestRecord: { percent: number; exerciseName: string; exerciseId: string } | undefined;
  let reachedLevel: { levelId: string; topPercent: number; exerciseName: string; exerciseId: string } | undefined;
  let closeLevel: { levelId: string; kg: number; exerciseName: string; exerciseId: string } | undefined;

  for (const exercise of session.exercises) {
    const before = analyzeExercisePerformance({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      sessions: previousSessions,
      bodyweightEntries,
      sex: profile.sex,
    });
    const after = analyzeExercisePerformance({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      sessions: afterSessions,
      bodyweightEntries,
      sex: profile.sex,
    });
    if (!after.best || after.best.date !== session.date) continue;

    if (before.best) {
      const improvement = ((after.best.estimatedOneRepMaxKg - before.best.estimatedOneRepMaxKg) /
        before.best.estimatedOneRepMaxKg) * 100;
      if (improvement >= 1 && (!bestRecord || improvement > bestRecord.percent)) {
        bestRecord = {
          percent: Math.round(improvement * 10) / 10,
          exerciseName: exercise.exerciseName,
          exerciseId: exercise.exerciseId,
        };
      }
    }

    const afterLevel = after.percentile?.level;
    const beforeLevel = before.percentile?.level;
    if (
      afterLevel &&
      afterLevel.topPercent <= 10 &&
      (!beforeLevel || afterLevel.topPercent < beforeLevel.topPercent)
    ) {
      if (!reachedLevel || afterLevel.topPercent < reachedLevel.topPercent) {
        reachedLevel = {
          levelId: afterLevel.id,
          topPercent: afterLevel.topPercent,
          exerciseName: exercise.exerciseName,
          exerciseId: exercise.exerciseId,
        };
      }
    } else if (
      after.percentile?.nextLevel &&
      after.percentile.kgToNextLevel !== undefined &&
      after.percentile.kgToNextLevel > 0 &&
      after.percentile.kgToNextLevel <= 10
    ) {
      if (!closeLevel || after.percentile.kgToNextLevel < closeLevel.kg) {
        closeLevel = {
          levelId: after.percentile.nextLevel.id,
          kg: after.percentile.kgToNextLevel,
          exerciseName: exercise.exerciseName,
          exerciseId: exercise.exerciseId,
        };
      }
    }
  }

  const templates = performanceRules.notificationTemplates;
  if (reachedLevel) {
    return {
      kind: 'level',
      title: translate(language, templates.levelReachedTitleKey),
      body: translate(language, templates.levelReachedBodyKey, {
        level: levelLabel(language, reachedLevel.levelId),
        exercise: reachedLevel.exerciseName,
      }),
      exerciseId: reachedLevel.exerciseId,
    };
  }
  if (bestRecord) {
    return {
      kind: 'record',
      title: translate(language, templates.prTitleKey),
      body: translate(language, templates.prBodyKey, {
        exercise: bestRecord.exerciseName,
        percent: bestRecord.percent,
      }),
      exerciseId: bestRecord.exerciseId,
    };
  }
  if (closeLevel) {
    return {
      kind: 'close-to-level',
      title: translate(language, templates.closeToLevelTitleKey),
      body: translate(language, templates.closeToLevelBodyKey, {
        kg: closeLevel.kg,
        level: levelLabel(language, closeLevel.levelId),
      }),
      exerciseId: closeLevel.exerciseId,
    };
  }

  const consistency = calculateConsistencyMetrics(
    afterSessions,
    profile.weeklySessionGoal,
    profile.monthlySessionGoal
  );
  if (consistency.thisWeek === profile.weeklySessionGoal - 1) {
    return {
      kind: 'weekly-goal',
      title: translate(language, templates.weeklyGoalTitleKey),
      body: translate(language, templates.weeklyGoalBodyKey),
    };
  }
  return undefined;
}

async function configurePerformanceChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(PERFORMANCE_CHANNEL_ID, {
    name: 'Progression et records',
    description: 'Messages motivants calculés depuis vos performances',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 160],
    lightColor: '#2F6BFF',
    showBadge: false,
  });
}

export async function schedulePerformanceNotification(
  insight: PerformanceNotificationInsight
): Promise<string | null> {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    const granted = permissions.granted ||
      permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) return null;

    await configurePerformanceChannel();
    return await Notifications.scheduleNotificationAsync({
      identifier: PERFORMANCE_NOTIFICATION_ID,
      content: {
        title: insight.title,
        body: insight.body,
        sound: 'default',
        data: { kind: insight.kind, exerciseId: insight.exerciseId, url: '/(tabs)/progress' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
        channelId: PERFORMANCE_CHANNEL_ID,
      },
    });
  } catch {
    return null;
  }
}
