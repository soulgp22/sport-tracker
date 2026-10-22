import {
  ACTIVE_KCAL_GOAL_LIMITS,
  DEFAULT_ACTIVE_KCAL_GOAL,
  DEFAULT_STEPS_GOAL,
  STEPS_GOAL_LIMITS,
  buildDailyGoalsSnapshot,
  clampGoal,
} from '../dailyGoals';

const TARGETS = { stepsGoal: 8000, activeKcalGoal: 500, weeklySessionGoal: 3 };

describe('buildDailyGoalsSnapshot', () => {
  it('calcule la progression de chaque anneau, bornee a 1', () => {
    const snapshot = buildDailyGoalsSnapshot(
      { steps: 6240, activeKcal: 410, sessionsThisWeek: 2 },
      TARGETS
    );

    expect(snapshot.steps).toEqual({ kind: 'progress', value: 6240, goal: 8000, ratio: 0.78, reached: false });
    expect(snapshot.sessions).toMatchObject({ kind: 'progress', value: 2, goal: 3, reached: false });
    expect(snapshot.activeKcal).toMatchObject({ kind: 'progress', value: 410, goal: 500, ratio: 0.82 });
  });

  it('marque un objectif atteint et plafonne le ratio a 1 au-dela', () => {
    const snapshot = buildDailyGoalsSnapshot(
      { steps: 12000, activeKcal: 500, sessionsThisWeek: 4 },
      TARGETS
    );

    expect(snapshot.steps).toMatchObject({ ratio: 1, reached: true, value: 12000 });
    expect(snapshot.activeKcal).toMatchObject({ ratio: 1, reached: true });
    expect(snapshot.sessions).toMatchObject({ ratio: 1, reached: true, value: 4 });
  });

  it('une donnee absente donne un anneau indisponible, jamais un 0', () => {
    const snapshot = buildDailyGoalsSnapshot(
      { steps: null, activeKcal: null, sessionsThisWeek: 0 },
      TARGETS
    );

    expect(snapshot.steps).toEqual({ kind: 'unavailable', goal: 8000 });
    expect(snapshot.activeKcal).toEqual({ kind: 'unavailable', goal: 500 });
    // Zero seance est une vraie valeur : l'anneau existe, vide.
    expect(snapshot.sessions).toEqual({ kind: 'progress', value: 0, goal: 3, ratio: 0, reached: false });
  });

  it('zero pas avec Health Connect connecte reste une progression a 0', () => {
    const snapshot = buildDailyGoalsSnapshot({ steps: 0, activeKcal: 0, sessionsThisWeek: 0 }, TARGETS);

    expect(snapshot.steps).toMatchObject({ kind: 'progress', value: 0, ratio: 0 });
    expect(snapshot.activeKcal).toMatchObject({ kind: 'progress', value: 0, ratio: 0 });
  });

  it('arrondit les valeurs decimales et refuse les negatives', () => {
    const snapshot = buildDailyGoalsSnapshot(
      { steps: 123.6, activeKcal: -5, sessionsThisWeek: 1 },
      TARGETS
    );

    expect(snapshot.steps).toMatchObject({ value: 124 });
    expect(snapshot.activeKcal).toEqual({ kind: 'unavailable', goal: 500 });
  });

  it('un objectif a zero ne divise jamais par zero', () => {
    const snapshot = buildDailyGoalsSnapshot(
      { steps: 100, activeKcal: 100, sessionsThisWeek: 1 },
      { stepsGoal: 0, activeKcalGoal: 0, weeklySessionGoal: 0 }
    );

    expect(snapshot.steps).toMatchObject({ ratio: 0, reached: false });
    expect(snapshot.sessions).toMatchObject({ ratio: 0, reached: false });
  });
});

describe('clampGoal', () => {
  it('borne aux limites et arrondit', () => {
    expect(clampGoal(500, STEPS_GOAL_LIMITS, DEFAULT_STEPS_GOAL)).toBe(STEPS_GOAL_LIMITS.minimum);
    expect(clampGoal(99999, STEPS_GOAL_LIMITS, DEFAULT_STEPS_GOAL)).toBe(STEPS_GOAL_LIMITS.maximum);
    expect(clampGoal(450.4, ACTIVE_KCAL_GOAL_LIMITS, DEFAULT_ACTIVE_KCAL_GOAL)).toBe(450);
  });

  it('rend le defaut pour toute valeur invalide', () => {
    expect(clampGoal(undefined, STEPS_GOAL_LIMITS, DEFAULT_STEPS_GOAL)).toBe(DEFAULT_STEPS_GOAL);
    expect(clampGoal('8000', STEPS_GOAL_LIMITS, DEFAULT_STEPS_GOAL)).toBe(DEFAULT_STEPS_GOAL);
    expect(clampGoal(Number.NaN, STEPS_GOAL_LIMITS, DEFAULT_STEPS_GOAL)).toBe(DEFAULT_STEPS_GOAL);
  });
});
