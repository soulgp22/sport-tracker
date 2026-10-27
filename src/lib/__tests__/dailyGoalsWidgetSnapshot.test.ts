import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildDailyGoalsSnapshot } from '../dailyGoals';
import {
  DAILY_GOALS_WIDGET_SNAPSHOT_KEY,
  expireDailyGoalsWidgetSnapshot,
  parseDailyGoalsWidgetSnapshot,
  readDailyGoalsWidgetSnapshot,
  writeDailyGoalsWidgetSnapshot,
  type DailyGoalsWidgetSnapshot,
} from '../widgets/dailyGoalsWidgetSnapshot';

const LABELS = { title: 'Objectifs du jour', steps: 'Pas', sessions: 'Séances · sem.', activeKcal: 'kcal actives' };

function sample(dayKey: string): DailyGoalsWidgetSnapshot {
  return {
    version: 1,
    dayKey,
    locale: 'fr-FR',
    labels: LABELS,
    snapshot: buildDailyGoalsSnapshot(
      { steps: 6240, activeKcal: 410, sessionsThisWeek: 2 },
      { stepsGoal: 8000, activeKcalGoal: 500, weeklySessionGoal: 3 }
    ),
  };
}

describe('instantane du widget objectifs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('ecrit puis relit le meme instantane le meme jour', async () => {
    const now = new Date(2026, 9, 20, 14, 0, 0);
    await writeDailyGoalsWidgetSnapshot(
      { locale: 'fr-FR', labels: LABELS, snapshot: sample('x').snapshot },
      now
    );

    const stored = await readDailyGoalsWidgetSnapshot(now);

    expect(stored).toEqual(sample('2026-10-20'));
    expect(await AsyncStorage.getItem(DAILY_GOALS_WIDGET_SNAPSHOT_KEY)).toContain('"dayKey":"2026-10-20"');
  });

  it('le lendemain, les pas et la depense redeviennent inconnus, pas les seances', () => {
    const expired = expireDailyGoalsWidgetSnapshot(sample('2026-10-19'), new Date(2026, 9, 20, 8));

    expect(expired.dayKey).toBe('2026-10-20');
    expect(expired.snapshot.steps).toEqual({ kind: 'unavailable', goal: 8000 });
    expect(expired.snapshot.activeKcal).toEqual({ kind: 'unavailable', goal: 500 });
    expect(expired.snapshot.sessions).toMatchObject({ kind: 'progress', value: 2 });
    expect(expired.labels).toEqual(LABELS);
  });

  it('refuse un JSON corrompu ou incomplet', () => {
    expect(parseDailyGoalsWidgetSnapshot(null)).toBeNull();
    expect(parseDailyGoalsWidgetSnapshot('{pas du json')).toBeNull();
    expect(parseDailyGoalsWidgetSnapshot(JSON.stringify({ version: 2 }))).toBeNull();
    expect(
      parseDailyGoalsWidgetSnapshot(
        JSON.stringify({ ...sample('2026-10-20'), snapshot: { steps: { kind: 'progress' } } })
      )
    ).toBeNull();
    expect(
      parseDailyGoalsWidgetSnapshot(JSON.stringify({ ...sample('2026-10-20'), labels: { title: 'x' } }))
    ).toBeNull();
  });

  it('accepte un instantane valide', () => {
    expect(parseDailyGoalsWidgetSnapshot(JSON.stringify(sample('2026-10-20')))).toEqual(sample('2026-10-20'));
  });
});

describe('entrees du recalcul en arriere-plan', () => {
  const inputs = {
    targets: { stepsGoal: 8000, activeKcalGoal: 500, weeklySessionGoal: 3 },
    sessionsThisWeek: 2,
    weekKey: '2026-10-26',
    sessionKcalToday: 120,
    profile: { sex: 'male', weightKg: 80, heightCm: 180, ageYears: 30, activityLevel: 'moderate' },
  };

  it('des entrees valides sont conservees', () => {
    const parsed = parseDailyGoalsWidgetSnapshot(JSON.stringify({ ...sample('2026-10-20'), inputs }));
    expect(parsed?.inputs).toEqual(inputs);
  });

  it('un profil incomplet (poids absent) reste valide', () => {
    const partial = { ...inputs, profile: { sex: 'unspecified', activityLevel: 'sedentary' } };
    const parsed = parseDailyGoalsWidgetSnapshot(JSON.stringify({ ...sample('2026-10-20'), inputs: partial }));
    expect(parsed?.inputs).toEqual(partial);
  });

  it('des entrees illisibles sont ignorees sans perdre l’instantane', () => {
    const broken = { ...inputs, sessionsThisWeek: 'deux' };
    const parsed = parseDailyGoalsWidgetSnapshot(JSON.stringify({ ...sample('2026-10-20'), inputs: broken }));
    expect(parsed).not.toBeNull();
    expect(parsed?.inputs).toBeUndefined();
    expect(parsed?.snapshot).toEqual(sample('2026-10-20').snapshot);
  });
});
