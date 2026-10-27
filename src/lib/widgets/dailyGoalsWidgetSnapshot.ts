/**
 * Instantane partage entre l'app et le widget Android « Objectifs du jour ».
 *
 * Le widget ne peut pas executer l'arbre React de l'app : son gestionnaire
 * tourne en JS headless, sans ecrans ni hooks. L'accueil ecrit donc dans
 * AsyncStorage le dernier instantane calcule (valeurs, cibles, libelles deja
 * traduits, jour local) et le widget le relit. Un seul point d'ecriture, une
 * seule fonction de calcul (`buildDailyGoalsSnapshot`) : l'accueil et le
 * widget affichent le meme chiffre.
 *
 * Perime (jour local different) = les pas et la depense redeviennent
 * inconnus. Le widget ne montre jamais les chiffres d'hier comme ceux du jour.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { localDayKey } from '../dateKeys';
import type { DailyGoalTargets, DailyGoalsSnapshot } from '../dailyGoals';
import type { EnergyProfile } from '../energyBalance';

export const DAILY_GOALS_WIDGET_SNAPSHOT_KEY = 'daily-goals-widget-snapshot-v1';

export interface DailyGoalsWidgetLabels {
  title: string;
  steps: string;
  sessions: string;
  activeKcal: string;
}

/**
 * Ce qu'il faut au widget pour RECALCULER les anneaux seul, en arriere-plan,
 * avec les pas frais de Health Connect (2026-10-27). Absent des instantanes
 * ecrits avant 1.39.4 : le widget retombe alors sur l'ancien comportement.
 */
export interface DailyGoalsWidgetInputs {
  targets: DailyGoalTargets;
  /** Seances terminees dans la semaine `weekKey` (lundi, voir weekStartKey). */
  sessionsThisWeek: number;
  weekKey: string;
  /** Depense nette des seances du jour `dayKey`. */
  sessionKcalToday: number;
  profile: EnergyProfile;
}

export interface DailyGoalsWidgetSnapshot {
  version: 1;
  dayKey: string;
  locale: string;
  labels: DailyGoalsWidgetLabels;
  snapshot: DailyGoalsSnapshot;
  inputs?: DailyGoalsWidgetInputs;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || value === null || isFiniteNumber(value);
}

function isInputs(value: unknown): value is DailyGoalsWidgetInputs {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const targets = v.targets as Record<string, unknown> | undefined;
  const profile = v.profile as Record<string, unknown> | undefined;
  return (
    !!targets &&
    isFiniteNumber(targets.stepsGoal) &&
    isFiniteNumber(targets.activeKcalGoal) &&
    isFiniteNumber(targets.weeklySessionGoal) &&
    isFiniteNumber(v.sessionsThisWeek) &&
    typeof v.weekKey === 'string' &&
    isFiniteNumber(v.sessionKcalToday) &&
    !!profile &&
    typeof profile.sex === 'string' &&
    typeof profile.activityLevel === 'string' &&
    isOptionalNumber(profile.weightKg) &&
    isOptionalNumber(profile.heightCm) &&
    isOptionalNumber(profile.ageYears)
  );
}

function isRing(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const ring = value as Record<string, unknown>;
  if (ring.kind === 'unavailable') return typeof ring.goal === 'number';
  return (
    ring.kind === 'progress' &&
    typeof ring.value === 'number' &&
    typeof ring.goal === 'number' &&
    typeof ring.ratio === 'number' &&
    typeof ring.reached === 'boolean'
  );
}

/** Valide un JSON lu depuis le stockage ; `null` pour tout contenu suspect. */
export function parseDailyGoalsWidgetSnapshot(raw: string | null): DailyGoalsWidgetSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || parsed.version !== 1) return null;
    if (typeof parsed.dayKey !== 'string' || typeof parsed.locale !== 'string') return null;
    const labels = parsed.labels as Record<string, unknown> | undefined;
    if (
      !labels ||
      ['title', 'steps', 'sessions', 'activeKcal'].some(
        (key) => typeof labels[key] !== 'string'
      )
    ) {
      return null;
    }
    const snapshot = parsed.snapshot as Record<string, unknown> | undefined;
    if (!snapshot || !isRing(snapshot.steps) || !isRing(snapshot.sessions) || !isRing(snapshot.activeKcal)) {
      return null;
    }
    // Des entrees illisibles ne cassent pas l'instantane : on les ignore.
    const stored = parsed as unknown as DailyGoalsWidgetSnapshot;
    if (parsed.inputs !== undefined && !isInputs(parsed.inputs)) {
      const { inputs: _ignored, ...rest } = stored;
      return rest;
    }
    return stored;
  } catch {
    return null;
  }
}

/**
 * Un instantane d'un autre jour garde ses cibles, ses libelles et la semaine
 * de seances, mais perd les pas et la depense : ce sont des valeurs du jour.
 */
export function expireDailyGoalsWidgetSnapshot(
  stored: DailyGoalsWidgetSnapshot,
  now: Date
): DailyGoalsWidgetSnapshot {
  const today = localDayKey(now);
  if (stored.dayKey === today) return stored;
  return {
    ...stored,
    dayKey: today,
    snapshot: {
      ...stored.snapshot,
      steps: { kind: 'unavailable', goal: stored.snapshot.steps.goal },
      activeKcal: { kind: 'unavailable', goal: stored.snapshot.activeKcal.goal },
    },
  };
}

export async function writeDailyGoalsWidgetSnapshot(
  value: Omit<DailyGoalsWidgetSnapshot, 'version' | 'dayKey'>,
  now: Date = new Date()
): Promise<void> {
  const payload: DailyGoalsWidgetSnapshot = { version: 1, dayKey: localDayKey(now), ...value };
  await AsyncStorage.setItem(DAILY_GOALS_WIDGET_SNAPSHOT_KEY, JSON.stringify(payload));
}

/** Instantane brut, NON expire : le rafraichissement d'arriere-plan a besoin du jour d'origine. */
export async function readRawDailyGoalsWidgetSnapshot(): Promise<DailyGoalsWidgetSnapshot | null> {
  return parseDailyGoalsWidgetSnapshot(await AsyncStorage.getItem(DAILY_GOALS_WIDGET_SNAPSHOT_KEY));
}

export async function readDailyGoalsWidgetSnapshot(
  now: Date = new Date()
): Promise<DailyGoalsWidgetSnapshot | null> {
  const stored = parseDailyGoalsWidgetSnapshot(
    await AsyncStorage.getItem(DAILY_GOALS_WIDGET_SNAPSHOT_KEY)
  );
  return stored ? expireDailyGoalsWidgetSnapshot(stored, now) : null;
}
