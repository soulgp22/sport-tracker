import { buildDailyGoalsSnapshot, goalActiveKcalFrom } from '../dailyGoals';
import { estimateActiveCaloriesFromSteps, resolveDailyEnergyExpenditure } from '../energyBalance';
import { weekStartKey } from '../performanceEngine';
import { refreshDailyGoalsSnapshot } from '../widgets/dailyGoalsWidgetRefresh';
import type { DailyGoalsWidgetSnapshot } from '../widgets/dailyGoalsWidgetSnapshot';

const LABELS = { title: 'Objectifs du jour', steps: 'Pas', sessions: 'Séances', activeKcal: 'kcal' };
const TARGETS = { stepsGoal: 8000, activeKcalGoal: 500, weeklySessionGoal: 3 };
const PROFILE = { sex: 'male' as const, weightKg: 80, heightCm: 180, ageYears: 30, activityLevel: 'moderate' as const };

// Mardi 27 octobre 2026, 15 h locale.
const NOW = new Date(2026, 9, 27, 15, 0, 0);

function stored(overrides: Partial<DailyGoalsWidgetSnapshot> = {}): DailyGoalsWidgetSnapshot {
  return {
    version: 1,
    dayKey: '2026-10-27',
    locale: 'fr-FR',
    labels: LABELS,
    snapshot: buildDailyGoalsSnapshot({ steps: 1000, activeKcal: 40, sessionsThisWeek: 2 }, TARGETS),
    inputs: {
      targets: TARGETS,
      sessionsThisWeek: 2,
      weekKey: weekStartKey(NOW),
      sessionKcalToday: 120,
      profile: PROFILE,
    },
    ...overrides,
  };
}

describe('refreshDailyGoalsSnapshot — widget app fermee', () => {
  it('pas frais : les trois anneaux sont recalcules avec les memes regles que l’accueil', () => {
    const result = refreshDailyGoalsSnapshot(stored(), 6240, NOW);

    const expected = resolveDailyEnergyExpenditure({
      healthCalories: null,
      healthSteps: 6240,
      profile: PROFILE,
      sessionKcal: 120,
    });
    expect(result.steps).toMatchObject({ kind: 'progress', value: 6240, goal: 8000 });
    expect(result.activeKcal).toMatchObject({ kind: 'progress', value: goalActiveKcalFrom(expected, true) });
    // La depense suit les pas : plus de pas = plus de kcal que l'instantane de l'app.
    expect((result.activeKcal as { value: number }).value).toBeGreaterThan(40);
    expect(result.sessions).toMatchObject({ value: 2, goal: 3 });
  });

  it('le lendemain : les seances d’hier ne comptent plus dans la depense du jour', () => {
    const tomorrow = new Date(2026, 9, 28, 9, 0, 0);
    const result = refreshDailyGoalsSnapshot(stored(), 3000, tomorrow);

    const stepsOnly = estimateActiveCaloriesFromSteps(3000, 80).activeCaloriesKcal;
    expect(result.steps).toMatchObject({ value: 3000 });
    expect(result.activeKcal).toMatchObject({ kind: 'progress', value: stepsOnly });
  });

  it('une nouvelle semaine remet le compteur de seances a zero', () => {
    const nextMonday = new Date(2026, 10, 2, 9, 0, 0);
    const result = refreshDailyGoalsSnapshot(stored(), 500, nextMonday);

    expect(result.sessions).toMatchObject({ kind: 'progress', value: 0, goal: 3 });
  });

  it('lecture impossible le meme jour : l’instantane de l’app reste affiche', () => {
    const result = refreshDailyGoalsSnapshot(stored(), null, NOW);

    expect(result.steps).toMatchObject({ value: 1000 });
    expect(result.activeKcal).toMatchObject({ value: 40 });
  });

  it('lecture impossible le lendemain : pas et depense inconnus, jamais les chiffres d’hier', () => {
    const tomorrow = new Date(2026, 9, 28, 9, 0, 0);
    const result = refreshDailyGoalsSnapshot(stored(), null, tomorrow);

    expect(result.steps).toEqual({ kind: 'unavailable', goal: 8000 });
    expect(result.activeKcal).toEqual({ kind: 'unavailable', goal: 500 });
    expect(result.sessions).toMatchObject({ value: 2 });
  });

  it('instantane ancien (sans entrees) : seuls les pas sont rafraichis', () => {
    const legacy = stored({ inputs: undefined });
    const result = refreshDailyGoalsSnapshot(legacy, 9000, NOW);

    expect(result.steps).toMatchObject({ value: 9000, reached: true });
    expect(result.activeKcal).toMatchObject({ value: 40 });
  });
});
