import { DEFAULT_ACTIVE_KCAL_GOAL, DEFAULT_STEPS_GOAL } from '../../lib/dailyGoals';
import { useDailyGoalsStore } from '../dailyGoalsStore';

type MergeFn = (persisted: unknown, current: unknown) => unknown;

function getMergeFn(): MergeFn {
  return useDailyGoalsStore.persist.getOptions().merge as MergeFn;
}

const current = { stepsGoal: DEFAULT_STEPS_GOAL, activeKcalGoal: DEFAULT_ACTIVE_KCAL_GOAL };

describe('dailyGoalsStore', () => {
  beforeEach(() => {
    useDailyGoalsStore.setState({ stepsGoal: DEFAULT_STEPS_GOAL, activeKcalGoal: DEFAULT_ACTIVE_KCAL_GOAL });
  });

  it('les setters bornent les objectifs', () => {
    useDailyGoalsStore.getState().setStepsGoal(500);
    expect(useDailyGoalsStore.getState().stepsGoal).toBe(1000);

    useDailyGoalsStore.getState().setActiveKcalGoal(10000);
    expect(useDailyGoalsStore.getState().activeKcalGoal).toBe(3000);

    useDailyGoalsStore.getState().setStepsGoal(8500);
    expect(useDailyGoalsStore.getState().stepsGoal).toBe(8500);
  });

  it('merge restaure les deux champs depuis le stockage', () => {
    const merged = getMergeFn()({ stepsGoal: 10000, activeKcalGoal: 600 }, current) as typeof current;

    expect(merged.stepsGoal).toBe(10000);
    expect(merged.activeKcalGoal).toBe(600);
  });

  it('merge ramene au defaut un stockage absent, corrompu ou hors bornes', () => {
    expect(getMergeFn()(null, current)).toMatchObject(current);
    expect(getMergeFn()('corrompu', current)).toMatchObject(current);
    expect(getMergeFn()({ stepsGoal: 'dix mille', activeKcalGoal: -3 }, current)).toMatchObject({
      stepsGoal: DEFAULT_STEPS_GOAL,
      activeKcalGoal: 50,
    });
  });
});
