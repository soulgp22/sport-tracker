import {
  aggregateHistory,
  buildDailyHistory,
  historyStartDay,
  sessionCaloriesByDay,
  type DailyHealthData,
} from '../energyHistory';
import { resolveDailyEnergyExpenditure, estimateActiveCaloriesFromSteps } from '../energyBalance';
import { estimateSessionCalories } from '../sessionCalories';
import type { Session, WeightEntry } from '../../types';

const PROFILE = { sex: 'male' as const, heightCm: 180, ageYears: 30, activityLevel: 'sedentary' as const };

function weight(date: string, kg: number): WeightEntry {
  return { id: date, date: `${date}T08:00:00.000Z`, weight: kg, source: 'manual' };
}

function session(localDate: Date, sets = 16): Session {
  return {
    id: String(localDate.getTime()),
    date: localDate.toISOString(),
    durationSeconds: 3600,
    exercises: [
      {
        exerciseId: 'x',
        exerciseName: 'X',
        sets: Array.from({ length: sets }, () => ({
          targetReps: 10,
          targetWeight: 50,
          targetRestSeconds: 90,
          actualReps: 10,
          actualWeight: 50,
          completed: true,
        })),
      },
    ],
  };
}

describe('sessionCaloriesByDay', () => {
  /**
   * Une seance appartient au jour LOCAL de l'utilisateur. Une cle UTC
   * (`toISOString().slice(0, 10)`) se trompe aux DEUX bords de la journee :
   * - a l'est de Greenwich (France), une seance juste apres minuit glisse au
   *   jour UTC PRECEDENT ;
   * - a l'ouest (Ameriques), une seance tardive glisse au jour UTC SUIVANT.
   * Tester les deux bords rend le test utile dans tout fuseau non UTC ; en
   * fuseau UTC strict, aucun cas ne peut le faire echouer.
   */
  it('range les seances des deux bords de la journee dans le jour local', () => {
    const justAfterMidnight = new Date(2026, 8, 21, 0, 30);
    const lateEvening = new Date(2026, 8, 20, 23, 30);
    const byDay = sessionCaloriesByDay(
      [session(justAfterMidnight), session(lateEvening)],
      [weight('2026-09-01', 80)]
    );
    expect([...byDay.keys()].sort()).toEqual(['2026-09-20', '2026-09-21']);
  });

  it('additionne les seances d’un meme jour', () => {
    const morning = new Date(2026, 8, 20, 8, 0);
    const evening = new Date(2026, 8, 20, 19, 0);
    const byDay = sessionCaloriesByDay(
      [session(morning), session(evening)],
      [weight('2026-09-01', 80)]
    );
    const one = estimateSessionCalories(session(morning), 80)!.kcal;
    expect(byDay.get('2026-09-20')).toBe(2 * one);
  });
});

describe('buildDailyHistory', () => {
  /**
   * Invariant cle : un jour affiche le MEME chiffre dans l'historique et dans
   * le bilan de l'ecran Nutrition, parce qu'il passe par la meme fonction.
   */
  it('produit le meme total que le bilan du jour quand des donnees existent', () => {
    const health = new Map<string, DailyHealthData>([
      ['2026-09-20', { steps: 8000, activeKcal: null, totalKcal: null }],
    ]);
    const sessionsByDay = new Map([['2026-09-20', 250]]);
    const [entry] = buildDailyHistory({
      days: ['2026-09-20'],
      health,
      sessionsByDay,
      weightEntries: [weight('2026-09-01', 80)],
      profile: PROFILE,
    });

    const nutrition = resolveDailyEnergyExpenditure({
      healthCalories: null,
      healthSteps: 8000,
      profile: { ...PROFILE, weightKg: 80 },
      sessionKcal: 250,
    });
    expect(entry.totalKcal).toBe(nutrition.totalKcal);
  });

  it('lit le poids en vigueur CE jour-la', () => {
    const health = new Map<string, DailyHealthData>([
      ['2026-03-10', { steps: 8000, activeKcal: null, totalKcal: null }],
      ['2026-09-10', { steps: 8000, activeKcal: null, totalKcal: null }],
    ]);
    const [march, september] = buildDailyHistory({
      days: ['2026-03-10', '2026-09-10'],
      health,
      sessionsByDay: new Map(),
      weightEntries: [weight('2026-03-01', 95), weight('2026-09-01', 75)],
      profile: PROFILE,
    });
    expect(march.bodyKcal!).toBeGreaterThan(september.bodyKcal!);
    expect(march.stepsRelatedKcal).toBe(estimateActiveCaloriesFromSteps(8000, 95).activeCaloriesKcal);
  });

  it('n’ajoute pas les seances d’un jour mesure, mais les signale', () => {
    const health = new Map<string, DailyHealthData>([
      ['2026-09-20', { steps: 9000, activeKcal: 500, totalKcal: null }],
    ]);
    const [entry] = buildDailyHistory({
      days: ['2026-09-20'],
      health,
      sessionsByDay: new Map([['2026-09-20', 250]]),
      weightEntries: [weight('2026-09-01', 80)],
      profile: PROFILE,
    });
    expect(entry.mode).toBe('measured');
    expect(entry.measuredKcal).toBe(500);
    expect(entry.sessionsKcal).toBe(0);
    expect(entry.sessionsWithinMeasuredKcal).toBe(250);
    expect(entry.totalKcal).toBe(entry.bodyKcal! + 500);
  });

  it('ne devine aucune activite pour un jour sans donnee', () => {
    const [entry] = buildDailyHistory({
      days: ['2026-09-20'],
      health: new Map(),
      sessionsByDay: new Map(),
      weightEntries: [weight('2026-09-01', 80)],
      profile: PROFILE,
    });
    expect(entry.mode).toBe('unknown');
    expect(entry.totalKcal).toBe(entry.bodyKcal);
  });
});

describe('aggregateHistory', () => {
  const entries = buildDailyHistory({
    days: ['2026-08-31', '2026-09-01', '2026-09-02'],
    health: new Map<string, DailyHealthData>([
      ['2026-08-31', { steps: 5000, activeKcal: null, totalKcal: null }],
      ['2026-09-01', { steps: 7000, activeKcal: null, totalKcal: null }],
    ]),
    sessionsByDay: new Map([['2026-09-01', 200]]),
    weightEntries: [weight('2026-08-01', 80)],
    profile: PROFILE,
  });

  it('regroupe par mois, du plus recent au plus ancien', () => {
    const months = aggregateHistory(entries, 'month');
    expect(months.map((m) => m.key)).toEqual(['2026-09', '2026-08']);
  });

  it('additionne les jours d’un mois et compte les jours sans activite', () => {
    const [september] = aggregateHistory(entries, 'month');
    expect(september.steps).toBe(7000);
    expect(september.daysWithSteps).toBe(1);
    expect(september.sessionsKcal).toBe(200);
    expect(september.daysWithoutActivity).toBe(1);
    expect(september.totalKcal).toBe(
      entries.filter((e) => e.day.startsWith('2026-09')).reduce((s, e) => s + (e.totalKcal ?? 0), 0)
    );
  });

  it('regroupe par annee', () => {
    const [year] = aggregateHistory(entries, 'year');
    expect(year.key).toBe('2026');
    expect(year.steps).toBe(12000);
  });
});

describe('historyStartDay', () => {
  /**
   * Pas d'historique invente avant la premiere donnee reelle : sinon chaque
   * jour depuis des annees afficherait une « depense du corps » fictive.
   */
  it('commence a la plus ancienne donnee reelle', () => {
    const start = historyStartDay(
      [session(new Date(2026, 5, 15, 10))],
      [weight('2026-07-01', 80)],
      ['2026-08-01'],
      new Date(2026, 8, 22)
    );
    expect(start).toBe('2026-06-15');
  });

  it('commence aujourd’hui sans aucune donnee', () => {
    expect(historyStartDay([], [], [], new Date(2026, 8, 22))).toBe('2026-09-22');
  });
});
