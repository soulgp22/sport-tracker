/**
 * Historique de la depense calorique (A01) et des pas (A02), par jour, mois et
 * annee.
 *
 * AUCUN STOCKAGE NOUVEAU : tout est reconstruit a la demande.
 * - le metabolisme de base, depuis le profil et le poids EN VIGUEUR ce jour-la ;
 * - la depense des seances, depuis leur journal (lib/sessionCalories) ;
 * - les pas et les calories mesurees, lus dans Health Connect par l'appelant.
 * Un historique stocke finirait par diverger de ses sources ; celui-ci ne peut
 * pas.
 *
 * Chaque jour passe par `resolveDailyEnergyExpenditure`, la MEME fonction que le
 * bilan du jour : un jour donne affiche le meme chiffre dans l'historique et
 * dans l'ecran Nutrition, et la regle des deux modes exclusifs (mesure /
 * estime) s'applique partout a l'identique.
 *
 * Module PUR : aucune dependance a Health Connect, au stockage ni a l'UI.
 */
import type { Session, WeightEntry } from '../types';
import { getBodyweightForDate } from './performanceEngine';
import { estimateSessionCalories } from './sessionCalories';
import {
  resolveDailyEnergyExpenditure,
  type EnergyProfile,
  type ExpenditureMode,
} from './energyBalance';
import { endOfLocalDay, localDayKey } from './dateKeys';

/** Donnees Health Connect d'un jour. Absentes = jour non couvert. */
export interface DailyHealthData {
  steps: number | null;
  activeKcal: number | null;
  totalKcal: number | null;
}

export interface DailyHistoryEntry {
  day: string;
  mode: ExpenditureMode;
  totalKcal: number | null;
  bodyKcal: number | null;
  /** Calories des pas COMPTEES dans le total (mode estime). */
  stepsKcal: number;
  /** Depense des seances COMPTEE dans le total (mode estime). */
  sessionsKcal: number;
  /** Activite mesuree par Health Connect (mode mesure). */
  measuredKcal: number;
  /** Seances d'un jour mesure : deja incluses dans la mesure, affichees « dont ». */
  sessionsWithinMeasuredKcal: number;
  steps: number | null;
  /** Calories liees aux pas, quel que soit le mode (vue « pas »). */
  stepsRelatedKcal: number | null;
}

export type HistoryGranularity = 'day' | 'month' | 'year';

export interface HistoryBucket {
  key: string;
  totalKcal: number;
  bodyKcal: number;
  stepsKcal: number;
  sessionsKcal: number;
  measuredKcal: number;
  sessionsWithinMeasuredKcal: number;
  steps: number;
  stepsRelatedKcal: number;
  /** Jours du compartiment ayant un nombre de pas connu. */
  daysWithSteps: number;
  /** Jours du compartiment ayant une depense totale connue. */
  daysWithTotal: number;
  /** Jours sans aucune donnee d'activite : le total ne couvre que le corps. */
  daysWithoutActivity: number;
}

/** Depense nette des seances, regroupee par jour LOCAL. */
export function sessionCaloriesByDay(
  sessions: Pick<Session, 'date' | 'durationSeconds' | 'exercises'>[],
  weightEntries: WeightEntry[]
): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const session of sessions) {
    const estimate = estimateSessionCalories(
      session,
      getBodyweightForDate(weightEntries, session.date)
    );
    if (!estimate) continue;
    const day = localDayKey(new Date(session.date));
    byDay.set(day, (byDay.get(day) ?? 0) + estimate.kcal);
  }
  return byDay;
}

/**
 * Calcule la repartition de chaque jour demande.
 *
 * `profile` fournit sexe, taille, age et niveau d'activite ; le POIDS est
 * relu jour par jour dans l'historique des pesees. L'age retenu est l'age
 * actuel : l'ecart sur un historique de quelques annees est de l'ordre de
 * 5 kcal par an de BMR, negligeable devant l'incertitude de l'activite.
 */
export function buildDailyHistory({
  days,
  health,
  sessionsByDay,
  weightEntries,
  profile,
}: {
  days: string[];
  health: Map<string, DailyHealthData>;
  sessionsByDay: Map<string, number>;
  weightEntries: WeightEntry[];
  profile: Omit<EnergyProfile, 'weightKg'>;
}): DailyHistoryEntry[] {
  return days.map((day) => {
    const hc = health.get(day);
    const weightKg = getBodyweightForDate(weightEntries, endOfLocalDay(day).toISOString());
    const sessionKcal = sessionsByDay.get(day) ?? 0;

    const active = hc?.activeKcal ?? 0;
    const total = hc?.totalKcal ?? 0;
    const r = resolveDailyEnergyExpenditure({
      healthCalories: active > 0 || total > 0 ? { active, total } : null,
      healthSteps: hc?.steps ?? null,
      profile: { ...profile, weightKg },
      sessionKcal,
      // Un jour passe sans donnee reste « inconnu » : pas d'activite devinee.
      allowHabitualEstimate: false,
    });

    const b = r.breakdown;
    const estimated = b.mode === 'estimated';
    return {
      day,
      mode: b.mode,
      totalKcal: r.totalKcal,
      bodyKcal: b.bodyKcal,
      stepsKcal: estimated ? (b.stepsKcal ?? 0) : 0,
      sessionsKcal: estimated ? b.sessionsKcal : 0,
      measuredKcal: b.measuredKcal ?? 0,
      sessionsWithinMeasuredKcal: b.mode === 'measured' ? b.sessionsKcal : 0,
      steps: hc?.steps ?? null,
      stepsRelatedKcal: b.stepsKcal,
    };
  });
}

function bucketKey(day: string, granularity: HistoryGranularity): string {
  if (granularity === 'day') return day;
  if (granularity === 'month') return day.slice(0, 7);
  return day.slice(0, 4);
}

/**
 * Regroupe les jours par jour, mois ou annee, du plus recent au plus ancien.
 * Les sommes ne portent que sur les valeurs connues ; les compteurs de jours
 * permettent a l'ecran de dire ce que le total ne couvre pas.
 */
export function aggregateHistory(
  entries: DailyHistoryEntry[],
  granularity: HistoryGranularity
): HistoryBucket[] {
  const buckets = new Map<string, HistoryBucket>();

  for (const e of entries) {
    const key = bucketKey(e.day, granularity);
    const b =
      buckets.get(key) ??
      {
        key,
        totalKcal: 0,
        bodyKcal: 0,
        stepsKcal: 0,
        sessionsKcal: 0,
        measuredKcal: 0,
        sessionsWithinMeasuredKcal: 0,
        steps: 0,
        stepsRelatedKcal: 0,
        daysWithSteps: 0,
        daysWithTotal: 0,
        daysWithoutActivity: 0,
      };

    if (e.totalKcal !== null) {
      b.totalKcal += e.totalKcal;
      b.daysWithTotal += 1;
    }
    b.bodyKcal += e.bodyKcal ?? 0;
    b.stepsKcal += e.stepsKcal;
    b.sessionsKcal += e.sessionsKcal;
    b.measuredKcal += e.measuredKcal;
    b.sessionsWithinMeasuredKcal += e.sessionsWithinMeasuredKcal;
    if (e.steps !== null) {
      b.steps += e.steps;
      b.daysWithSteps += 1;
    }
    b.stepsRelatedKcal += e.stepsRelatedKcal ?? 0;
    if (e.mode === 'unknown') b.daysWithoutActivity += 1;

    buckets.set(key, b);
  }

  return [...buckets.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/**
 * Premier jour d'historique : la plus ancienne donnee REELLE de l'utilisateur
 * (seance, pesee ou jour Health Connect). Avant, afficher une depense du corps
 * reviendrait a inventer un historique anterieur a l'installation.
 */
export function historyStartDay(
  sessions: Pick<Session, 'date'>[],
  weightEntries: WeightEntry[],
  healthDays: string[],
  today: Date = new Date()
): string {
  const candidates = [
    ...sessions.map((s) => localDayKey(new Date(s.date))),
    ...weightEntries.map((w) => localDayKey(new Date(w.date))),
    ...healthDays,
  ].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

  const todayKey = localDayKey(today);
  if (candidates.length === 0) return todayKey;
  const earliest = candidates.sort()[0];
  return earliest < todayKey ? earliest : todayKey;
}
