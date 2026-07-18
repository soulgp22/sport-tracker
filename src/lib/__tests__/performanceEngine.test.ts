import type { Session } from '../../types';
import {
  analyzeExercisePerformance,
  calculateConsistencyMetrics,
  estimateCommunityPercentile,
  estimateOneRepMax,
  getBodyweightForDate,
  getExerciseRecords,
  getStrengthFamily,
} from '../performanceEngine';

function session(date: string, weight: number, reps: number): Session {
  return {
    id: date,
    date,
    durationSeconds: 3600,
    exercises: [
      {
        exerciseId: 'bench',
        exerciseName: 'Barbell Bench Press - Medium Grip',
        sets: [
          {
            targetReps: reps,
            targetWeight: weight,
            targetRestSeconds: 120,
            actualReps: reps,
            actualWeight: weight,
            completed: true,
          },
        ],
      },
    ],
  };
}

describe('performanceEngine', () => {
  it('blends Epley and Brzycki and lowers confidence after 10 reps', () => {
    const estimate = estimateOneRepMax(110, 14);
    expect(estimate).not.toBeNull();
    expect(estimate?.epleyKg).toBeCloseTo(161.3, 1);
    expect(estimate?.brzyckiKg).toBeCloseTo(172.2, 1);
    expect(estimate?.estimatedKg).toBeCloseTo(166.8, 1);
    expect(estimate?.confidence).toBe('low');
  });

  it('rejects unsupported repetition ranges', () => {
    expect(estimateOneRepMax(100, 0)).toBeNull();
    expect(estimateOneRepMax(100, 16)).toBeNull();
  });

  it('recognizes only compatible competition movements', () => {
    expect(getStrengthFamily('Barbell Bench Press - Medium Grip')).toBe('bench_press');
    expect(getStrengthFamily('Dumbbell Bench Press')).toBeUndefined();
  });

  it('builds a chronological personal-record history', () => {
    const records = getExerciseRecords(
      [session('2026-01-08T10:00:00.000Z', 80, 5), session('2026-01-01T10:00:00.000Z', 70, 5)],
      'bench',
      'Barbell Bench Press - Medium Grip'
    );
    expect(records).toHaveLength(2);
    expect(records[1].improvementPct).toBeGreaterThan(10);
  });

  it('uses the latest past weigh-in, or the earliest future one', () => {
    const entries = [
      { id: 'late', date: '2026-08-01T08:00:00.000Z', weight: 82 },
      { id: 'near', date: '2026-07-20T08:00:00.000Z', weight: 80 },
      { id: 'past', date: '2026-07-10T08:00:00.000Z', weight: 78 },
    ];
    expect(getBodyweightForDate(entries, '2026-07-18T10:00:00.000Z')).toBe(78);
    expect(getBodyweightForDate(entries.slice(0, 2), '2026-07-18T10:00:00.000Z')).toBe(80);
  });

  it('labels the example as an OpenIPF estimate using real sample thresholds', () => {
    const analysis = analyzeExercisePerformance({
      exerciseId: 'bench',
      exerciseName: 'Barbell Bench Press - Medium Grip',
      sessions: [session('2026-07-01T10:00:00.000Z', 110, 14)],
      bodyweightEntries: [{ id: 'weight', date: '2026-07-01T08:00:00.000Z', weight: 60 }],
      sex: 'male',
    });
    expect(analysis.percentile?.source).toBe('openipf');
    expect(analysis.percentile?.topPercent).toBe(1);
    expect(analysis.percentile?.isEstimate).toBe(true);
  });

  it('requires a sufficiently large comparable community sample', () => {
    expect(estimateCommunityPercentile([1, 2, 3], 2)).toBeUndefined();
    const population = Array.from({ length: 200 }, (_, index) => index + 1);
    expect(estimateCommunityPercentile(population, 180)).toBe(10);
  });

  it('calculates current goals and consecutive training weeks', () => {
    const sessions = [
      session('2026-07-15T10:00:00.000Z', 80, 5),
      session('2026-07-08T10:00:00.000Z', 80, 5),
      session('2026-07-01T10:00:00.000Z', 80, 5),
    ];
    const metrics = calculateConsistencyMetrics(sessions, 3, 12, new Date('2026-07-18T12:00:00.000Z'));
    expect(metrics.weeklyStreak).toBe(3);
    expect(metrics.thisWeek).toBe(1);
    expect(metrics.weeklyGoalProgress).toBeCloseTo(1 / 3);
  });
});
