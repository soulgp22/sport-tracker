import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MAX_NAME_LENGTH,
  usePerformanceStore,
} from '../performanceStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  usePerformanceStore.setState({
    sex: 'unspecified',
    age: undefined,
    heightCm: undefined,
    activityLevel: 'sedentary',
    experience: 'beginner',
    weeklySessionGoal: 3,
    monthlySessionGoal: 12,
    notificationsEnabled: false,
    programDescription: '',
    firstName: undefined,
    lastName: undefined,
    unlockedBadges: [],
  });
});

describe('performanceStore firstName / lastName', () => {
  // T1 : trim appliqué
  it('setFirstName("  Islam  ") -> firstName === "Islam" (trim appliqué)', () => {
    usePerformanceStore.getState().setFirstName('  Islam  ');
    expect(usePerformanceStore.getState().firstName).toBe('Islam');
  });

  // T2 : chaîne vide ou espaces -> undefined (PAS "")
  it("setFirstName('') -> firstName === undefined", () => {
    usePerformanceStore.getState().setFirstName('');
    expect(usePerformanceStore.getState().firstName).toBeUndefined();
  });

  it("setFirstName('   ') -> firstName === undefined", () => {
    usePerformanceStore.getState().setFirstName('   ');
    expect(usePerformanceStore.getState().firstName).toBeUndefined();
  });

  // T3 : bornage à MAX_NAME_LENGTH
  it(`borne une chaîne de 200 caractères à ${MAX_NAME_LENGTH} caractères`, () => {
    const longName = 'A'.repeat(200);
    usePerformanceStore.getState().setFirstName(longName);
    expect(usePerformanceStore.getState().firstName).toHaveLength(MAX_NAME_LENGTH);
    expect(usePerformanceStore.getState().firstName).toBe('A'.repeat(MAX_NAME_LENGTH));
  });

  // T4 : undefined reçu -> undefined stocké
  it('setFirstName(undefined) -> undefined', () => {
    usePerformanceStore.getState().setFirstName('Islam');
    expect(usePerformanceStore.getState().firstName).toBe('Islam');

    usePerformanceStore.getState().setFirstName(undefined);
    expect(usePerformanceStore.getState().firstName).toBeUndefined();
  });

  // setLastName : mêmes règles
  it("setLastName('  Dupont  ') normalise correctement", () => {
    usePerformanceStore.getState().setLastName('  Dupont  ');
    expect(usePerformanceStore.getState().lastName).toBe('Dupont');
  });

  it("setLastName('') -> undefined", () => {
    usePerformanceStore.getState().setLastName('');
    expect(usePerformanceStore.getState().lastName).toBeUndefined();
  });

  it(`setLastName borne à ${MAX_NAME_LENGTH} caractères`, () => {
    const longName = 'B'.repeat(200);
    usePerformanceStore.getState().setLastName(longName);
    expect(usePerformanceStore.getState().lastName).toHaveLength(MAX_NAME_LENGTH);
  });

  it('setLastName(undefined) -> undefined', () => {
    usePerformanceStore.getState().setLastName('Dupont');
    usePerformanceStore.getState().setLastName(undefined);
    expect(usePerformanceStore.getState().lastName).toBeUndefined();
  });
});

// Rétrocompatibilité : un état persisté antérieur sans firstName/lastName
// doit se relire sans exception (champs optionnels = undefined par défaut).
describe('performanceStore backward compatibility', () => {
  it('un état persisté antérieur sans firstName/lastName se relit sans exception', async () => {
    // Écrire un état ancien (sans firstName, sans lastName) dans AsyncStorage
    // sous la clé de persistance du store, pour déclencher une vraie rehydratation.
    const oldPersistedState = {
      state: {
        sex: 'male',
        age: 30,
        experience: 'intermediate',
        weeklySessionGoal: 4,
        monthlySessionGoal: 16,
        notificationsEnabled: true,
        programDescription: 'test',
        unlockedBadges: [],
      },
      version: 1,
    };

    await AsyncStorage.setItem(
      'performance-store',
      JSON.stringify(oldPersistedState),
    );

    // Déclencher une rehydratation réelle
    await usePerformanceStore.persist.rehydrate();

    const state = usePerformanceStore.getState();

    // Les champs absents de l'ancien état doivent valoir undefined
    expect(state.firstName).toBeUndefined();
    expect(state.lastName).toBeUndefined();

    // Un champ présent dans l'ancien état doit avoir été restauré
    // (c'est ce point qui rend le test capable d'échouer)
    expect(state.age).toBe(30);
  });
});
