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
import type { DailyGoalsSnapshot } from '../dailyGoals';

export const DAILY_GOALS_WIDGET_SNAPSHOT_KEY = 'daily-goals-widget-snapshot-v1';

export interface DailyGoalsWidgetLabels {
  title: string;
  steps: string;
  sessions: string;
  activeKcal: string;
}

export interface DailyGoalsWidgetSnapshot {
  version: 1;
  dayKey: string;
  locale: string;
  labels: DailyGoalsWidgetLabels;
  snapshot: DailyGoalsSnapshot;
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
    return parsed as unknown as DailyGoalsWidgetSnapshot;
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

export async function readDailyGoalsWidgetSnapshot(
  now: Date = new Date()
): Promise<DailyGoalsWidgetSnapshot | null> {
  const stored = parseDailyGoalsWidgetSnapshot(
    await AsyncStorage.getItem(DAILY_GOALS_WIDGET_SNAPSHOT_KEY)
  );
  return stored ? expireDailyGoalsWidgetSnapshot(stored, now) : null;
}
