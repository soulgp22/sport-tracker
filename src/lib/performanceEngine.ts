import openIpfReference from '../config/openipf-reference.json';
import performanceRules from '../config/performance-rules.json';
import type { Session, WeightEntry } from '../types';
import type {
  BadgeDefinition,
  BadgeMetrics,
  ConsistencyMetrics,
  ExercisePerformanceAnalysis,
  OneRepMaxEstimate,
  PerformanceProfile,
  PerformanceSnapshot,
  PerformanceSex,
  PersonalRecord,
  StrengthFamily,
  StrengthLevel,
} from '../types/performance';

interface AnalyzeExerciseInput {
  exerciseId: string;
  exerciseName: string;
  sessions: Session[];
  bodyweightEntries: WeightEntry[];
  sex: PerformanceSex;
}

type ThresholdKey = 'top50' | 'top25' | 'top10' | 'top5' | 'top3' | 'top1';
type RatioThresholds = Record<ThresholdKey, number>;

const levels = performanceRules.levels as StrengthLevel[];
const badgeDefinitions = performanceRules.badges as BadgeDefinition[];
const standardFamilies = openIpfReference.standards as Record<
  StrengthFamily,
  Record<'male' | 'female', { sampleSize: number; ratioThresholds: RatioThresholds }>
>;

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getStrengthFamily(exerciseName: string, exerciseId?: string): StrengthFamily | undefined {
  const normalized = normalizeName(exerciseName);
  for (const [family, config] of Object.entries(performanceRules.exerciseFamilies)) {
    if (
      (exerciseId && config.exerciseIds.includes(exerciseId)) ||
      config.matchers.some((matcher) => normalizeName(matcher) === normalized)
    ) {
      return family as StrengthFamily;
    }
  }
  return undefined;
}

export function estimateOneRepMax(weightKg: number, reps: number): OneRepMaxEstimate | null {
  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(reps) ||
    weightKg < performanceRules.oneRepMax.minimumWeightKg ||
    reps < 1 ||
    reps > performanceRules.oneRepMax.supportedMaxReps
  ) {
    return null;
  }

  const roundedReps = Math.round(reps);
  const epleyKg = roundedReps === 1 ? weightKg : weightKg * (1 + roundedReps / 30);
  const brzyckiKg = roundedReps === 1 ? weightKg : weightKg * (36 / (37 - roundedReps));
  const estimatedKg = (epleyKg + brzyckiKg) / 2;
  const confidence = roundedReps <= 5
    ? 'high'
    : roundedReps <= performanceRules.oneRepMax.highConfidenceMaxReps
      ? 'moderate'
      : 'low';

  return {
    epleyKg: round(epleyKg),
    brzyckiKg: round(brzyckiKg),
    estimatedKg: round(estimatedKg),
    reps: roundedReps,
    weightKg: round(weightKg),
    confidence,
  };
}

export function getExerciseRecords(
  sessions: Session[],
  exerciseId: string,
  exerciseName: string
): PersonalRecord[] {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const records: PersonalRecord[] = [];
  let previousBest = 0;

  for (const session of sorted) {
    const exercise = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (!exercise) continue;

    const estimates = exercise.sets
      .filter((set) => set.completed)
      .map((set) => ({ set, estimate: estimateOneRepMax(set.actualWeight, set.actualReps) }))
      .filter((item): item is typeof item & { estimate: OneRepMaxEstimate } => item.estimate !== null)
      .sort((a, b) => b.estimate.estimatedKg - a.estimate.estimatedKg);
    const best = estimates[0];
    if (!best || best.estimate.estimatedKg <= previousBest + 0.05) continue;

    records.push({
      exerciseId,
      exerciseName,
      date: session.date,
      estimatedOneRepMaxKg: best.estimate.estimatedKg,
      weightKg: best.set.actualWeight,
      reps: best.set.actualReps,
      improvementPct: previousBest > 0
        ? round(((best.estimate.estimatedKg - previousBest) / previousBest) * 100)
        : undefined,
    });
    previousBest = best.estimate.estimatedKg;
  }

  return records;
}

export function getBodyweightForDate(entries: WeightEntry[], targetDate: string) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const beforeOrOnDate = sorted.filter((entry) => entry.date <= targetDate).at(-1);
  return beforeOrOnDate?.weight ?? sorted[0]?.weight;
}

function interpolateTopPercent(ratio: number, thresholds: RatioThresholds) {
  const points = [
    { ratio: 0, topPercent: 100 },
    { ratio: thresholds.top50, topPercent: 50 },
    { ratio: thresholds.top25, topPercent: 25 },
    { ratio: thresholds.top10, topPercent: 10 },
    { ratio: thresholds.top5, topPercent: 5 },
    { ratio: thresholds.top3, topPercent: 3 },
    { ratio: thresholds.top1, topPercent: 1 },
  ];

  if (ratio >= thresholds.top1) return 1;
  for (let index = 1; index < points.length; index += 1) {
    const upper = points[index];
    const lower = points[index - 1];
    if (ratio <= upper.ratio) {
      const span = upper.ratio - lower.ratio;
      const progress = span > 0 ? (ratio - lower.ratio) / span : 1;
      return round(lower.topPercent + (upper.topPercent - lower.topPercent) * progress);
    }
  }
  return 1;
}

function thresholdForLevel(level: StrengthLevel, thresholds: RatioThresholds) {
  if (level.topPercent === 100) return 0;
  return thresholds[`top${level.topPercent}` as ThresholdKey];
}

export function estimateReferencePercentile(
  family: StrengthFamily,
  sex: Exclude<PerformanceSex, 'unspecified'>,
  estimatedOneRepMaxKg: number,
  bodyweightKg: number
) {
  if (estimatedOneRepMaxKg <= 0 || bodyweightKg <= 0) return undefined;
  const standard = standardFamilies[family][sex];
  const ratio = estimatedOneRepMaxKg / bodyweightKg;
  const thresholds = standard.ratioThresholds;

  let level = levels[0];
  let levelIndex = 0;
  for (let index = 1; index < levels.length; index += 1) {
    if (ratio >= thresholdForLevel(levels[index], thresholds)) {
      level = levels[index];
      levelIndex = index;
    }
  }

  const nextLevel = levels[levelIndex + 1];
  const nextRatio = nextLevel ? thresholdForLevel(nextLevel, thresholds) : undefined;
  return {
    family,
    ratio: round(ratio, 2),
    topPercent: interpolateTopPercent(ratio, thresholds),
    level,
    nextLevel,
    nextRatio,
    kgToNextLevel: nextRatio
      ? round(Math.max(0, nextRatio * bodyweightKg - estimatedOneRepMaxKg))
      : undefined,
    sampleSize: standard.sampleSize,
    source: 'openipf' as const,
    isEstimate: true,
  };
}

export function estimateCommunityPercentile(scores: number[], currentScore: number) {
  const valid = scores.filter((score) => Number.isFinite(score) && score > 0).sort((a, b) => a - b);
  if (valid.length < performanceRules.communityPhase.minimumComparableSampleSize) return undefined;
  const belowOrEqual = valid.filter((score) => score <= currentScore).length;
  return round(100 - (belowOrEqual / valid.length) * 100);
}

export function analyzeExercisePerformance({
  exerciseId,
  exerciseName,
  sessions,
  bodyweightEntries,
  sex,
}: AnalyzeExerciseInput): ExercisePerformanceAnalysis {
  const records = getExerciseRecords(sessions, exerciseId, exerciseName);
  const best = records.at(-1);
  const family = getStrengthFamily(exerciseName, exerciseId);
  if (!best) return { exerciseId, exerciseName, family, records };

  const estimate = estimateOneRepMax(best.weightKg, best.reps);
  const bodyweightKg = getBodyweightForDate(bodyweightEntries, best.date);
  const percentile = family && sex !== 'unspecified' && bodyweightKg
    ? estimateReferencePercentile(family, sex, best.estimatedOneRepMaxKg, bodyweightKg)
    : undefined;

  return {
    exerciseId,
    exerciseName,
    family,
    best,
    records,
    bodyweightKg,
    percentile,
    confidence: estimate?.confidence,
  };
}

function weekStartKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : new Date(value);
  const utcDay = date.getUTCDay();
  const offset = utcDay === 0 ? -6 : 1 - utcDay;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function calculateConsistencyMetrics(
  sessions: Session[],
  weeklyGoal: number,
  monthlyGoal: number,
  now = new Date()
): ConsistencyMetrics {
  const currentWeek = weekStartKey(now);
  const currentMonth = now.toISOString().slice(0, 7);
  const thisWeek = sessions.filter((session) => weekStartKey(session.date) === currentWeek).length;
  const thisMonth = sessions.filter((session) => session.date.slice(0, 7) === currentMonth).length;
  const activeWeeks = new Set(sessions.map((session) => weekStartKey(session.date)));

  let cursor = new Date(`${currentWeek}T00:00:00.000Z`);
  if (!activeWeeks.has(currentWeek)) cursor.setUTCDate(cursor.getUTCDate() - 7);
  let weeklyStreak = 0;
  while (activeWeeks.has(weekStartKey(cursor))) {
    weeklyStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }

  return {
    sessionCount: sessions.length,
    thisWeek,
    thisMonth,
    weeklyStreak,
    weeklyGoalProgress: Math.min(1, thisWeek / Math.max(1, weeklyGoal)),
    monthlyGoalProgress: Math.min(1, thisMonth / Math.max(1, monthlyGoal)),
  };
}

export function createBadgeMetrics(
  consistency: ConsistencyMetrics,
  analyses: ExercisePerformanceAnalysis[]
): BadgeMetrics {
  const improvements = analyses.flatMap((analysis) =>
    analysis.records.map((record) => record.improvementPct ?? 0)
  );
  const topPercents = analyses
    .map((analysis) => analysis.percentile?.topPercent)
    .filter((value): value is number => value !== undefined);

  return {
    ...consistency,
    bestPrImprovementPct: Math.max(0, ...improvements),
    inverseTopPercent: topPercents.length > 0 ? 100 - Math.min(...topPercents) : 0,
  };
}

export function getBadgeDefinitions() {
  return badgeDefinitions;
}

export function evaluateBadgeUnlocks(metrics: BadgeMetrics, unlockedIds: string[]) {
  const unlocked = new Set(unlockedIds);
  return badgeDefinitions
    .filter((badge) => !unlocked.has(badge.id) && metrics[badge.metric] >= badge.minimum)
    .map((badge) => badge.id);
}

export function getPerformanceReferenceMetadata() {
  return openIpfReference.source;
}

export function buildPerformanceSnapshot(
  sessions: Session[],
  bodyweightEntries: WeightEntry[],
  profile: PerformanceProfile
): PerformanceSnapshot {
  const exercises = new Map<string, string>();
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (!exercises.has(exercise.exerciseId)) {
        exercises.set(exercise.exerciseId, exercise.exerciseName);
      }
    }
  }

  const analyses = [...exercises].map(([exerciseId, exerciseName]) =>
    analyzeExercisePerformance({
      exerciseId,
      exerciseName,
      sessions,
      bodyweightEntries,
      sex: profile.sex,
    })
  );
  const consistency = calculateConsistencyMetrics(
    sessions,
    profile.weeklySessionGoal,
    profile.monthlySessionGoal
  );
  return {
    sessions,
    analyses,
    consistency,
    badgeMetrics: createBadgeMetrics(consistency, analyses),
  };
}
