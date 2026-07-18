import type { Session } from '../../types';
import type { PerformanceProfile } from '../../types/performance';
import { buildPerformanceNotificationInsight } from '../performanceNotifications';

const profile: PerformanceProfile = {
  sex: 'unspecified',
  experience: 'intermediate',
  weeklySessionGoal: 3,
  monthlySessionGoal: 12,
  notificationsEnabled: true,
  programDescription: '',
};

function workout(id: string, date: string, exerciseName: string, weight: number, reps: number): Session {
  return {
    id,
    date,
    durationSeconds: 2400,
    exercises: [{
      exerciseId: exerciseName,
      exerciseName,
      sets: [{
        targetReps: reps,
        targetWeight: weight,
        targetRestSeconds: 90,
        actualReps: reps,
        actualWeight: weight,
        completed: true,
      }],
    }],
  };
}

describe('performance notifications', () => {
  it('reports a real estimated-1RM improvement', () => {
    const previous = workout('old', '2026-07-14T10:00:00.000Z', 'Dumbbell Curl', 20, 8);
    const current = workout('new', '2026-07-18T10:00:00.000Z', 'Dumbbell Curl', 24, 8);
    const insight = buildPerformanceNotificationInsight({
      previousSessions: [previous],
      session: current,
      bodyweightEntries: [],
      profile,
      language: 'fr',
    });
    expect(insight?.kind).toBe('record');
    expect(insight?.body).toContain('%');
  });

  it('announces when one workout remains in the weekly goal', () => {
    const previous = workout('old', '2026-07-14T10:00:00.000Z', 'Dumbbell Curl', 20, 8);
    const current = workout('new', '2026-07-18T10:00:00.000Z', 'Cable Curl', 20, 8);
    const insight = buildPerformanceNotificationInsight({
      previousSessions: [previous],
      session: current,
      bodyweightEntries: [],
      profile,
      language: 'fr',
    });
    expect(insight?.kind).toBe('weekly-goal');
  });
});
