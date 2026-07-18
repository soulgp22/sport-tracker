import type { Session } from './index';

export type PerformanceSex = 'male' | 'female' | 'unspecified';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type StrengthFamily = 'bench_press' | 'back_squat' | 'deadlift';
export type EstimateConfidence = 'high' | 'moderate' | 'low';

export interface PerformanceProfile {
  sex: PerformanceSex;
  age?: number;
  experience: ExperienceLevel;
  weeklySessionGoal: number;
  monthlySessionGoal: number;
  notificationsEnabled: boolean;
  programDescription: string;
}

export interface OneRepMaxEstimate {
  epleyKg: number;
  brzyckiKg: number;
  estimatedKg: number;
  reps: number;
  weightKg: number;
  confidence: EstimateConfidence;
}

export interface StrengthLevel {
  id: string;
  label: string;
  topPercent: number;
  color: string;
}

export interface PercentileEstimate {
  family: StrengthFamily;
  ratio: number;
  topPercent: number;
  level: StrengthLevel;
  nextLevel?: StrengthLevel;
  nextRatio?: number;
  kgToNextLevel?: number;
  sampleSize: number;
  source: 'openipf' | 'community';
  isEstimate: boolean;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  date: string;
  estimatedOneRepMaxKg: number;
  weightKg: number;
  reps: number;
  improvementPct?: number;
}

export interface ExercisePerformanceAnalysis {
  exerciseId: string;
  exerciseName: string;
  family?: StrengthFamily;
  best?: PersonalRecord;
  records: PersonalRecord[];
  bodyweightKg?: number;
  percentile?: PercentileEstimate;
  confidence?: EstimateConfidence;
}

export interface ConsistencyMetrics {
  sessionCount: number;
  thisWeek: number;
  thisMonth: number;
  weeklyStreak: number;
  weeklyGoalProgress: number;
  monthlyGoalProgress: number;
}

export interface BadgeDefinition {
  id: string;
  label: string;
  labelKey?: string;
  description: string;
  icon: string;
  metric: keyof BadgeMetrics;
  minimum: number;
}

export interface BadgeMetrics extends ConsistencyMetrics {
  bestPrImprovementPct: number;
  inverseTopPercent: number;
}

export interface UnlockedBadge {
  id: string;
  unlockedAt: string;
}

export interface PerformanceSnapshot {
  sessions: Session[];
  analyses: ExercisePerformanceAnalysis[];
  consistency: ConsistencyMetrics;
  badgeMetrics: BadgeMetrics;
}
