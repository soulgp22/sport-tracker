import AsyncStorage from '@react-native-async-storage/async-storage';

import { useBodyWeightStore } from '../../store/bodyWeightStore';
import { useFoodDiaryStore } from '../../store/foodDiaryStore';
import { useFoodStore } from '../../store/foodStore';
import { useNutritionGoalsStore } from '../../store/nutritionGoalsStore';
import { useProgramStore } from '../../store/programStore';
import { useSessionStore } from '../../store/sessionStore';
import {
  buildProfileBackup,
  parseProfileBackup,
  restoreProfileBackup,
} from '../profileBackup';

beforeEach(async () => {
  await AsyncStorage.clear();
  useProgramStore.setState({ programs: [], exercises: [] });
  useSessionStore.setState({ sessions: [] });
  useFoodStore.setState({ customFoods: [] });
  useFoodDiaryStore.setState({ entries: [] });
  useNutritionGoalsStore.setState({
    goals: {
      dailyCalories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
      goalType: 'maintenance',
    },
  });
  useBodyWeightStore.setState({ entries: [] });
});

describe('profileBackup', () => {
  it('build, parse et restaure un profil complet', () => {
    useProgramStore.setState({
      programs: [
        {
          id: 'program-1',
          name: 'PPL',
          days: [],
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-02T00:00:00.000Z',
        },
      ],
      exercises: [{ id: 'exercise-1', name: 'Custom curl', muscleGroup: 'Arms' }],
    });
    useSessionStore.setState({
      sessions: [
        {
          id: 'session-1',
          date: '2026-07-03T10:00:00.000Z',
          durationSeconds: 3600,
          exercises: [],
        },
      ],
    });
    useFoodStore.setState({
      customFoods: [
        {
          id: 'food-1',
          name: 'Yaourt maison',
          category: 'Proteines',
          unit: 'g',
          isCustom: true,
          nutritionPer100g: { calories: 90, protein: 10, carbs: 6, fat: 2 },
        },
      ],
    });
    useFoodDiaryStore.setState({
      entries: [
        {
          id: 'food-entry-1',
          date: '2026-07-04T12:00:00.000Z',
          mealType: 'lunch',
          foodId: 'food-1',
          foodName: 'Yaourt maison',
          quantity: 200,
          unit: 'g',
          calculatedNutrition: { calories: 180, protein: 20, carbs: 12, fat: 4 },
        },
      ],
    });
    useNutritionGoalsStore.setState({
      goals: {
        dailyCalories: 2400,
        protein: 180,
        carbs: 250,
        fat: 70,
        goalType: 'gain',
        currentWeight: 80,
        targetWeight: 85,
      },
    });
    useBodyWeightStore.setState({
      entries: [{ id: 'weight-1', date: '2026-07-05T08:00:00.000Z', weight: 80.5 }],
    });

    const text = buildProfileBackup();
    const parsed = parseProfileBackup(text);
    expect(typeof parsed).not.toBe('string');

    useProgramStore.setState({ programs: [], exercises: [] });
    useSessionStore.setState({ sessions: [] });
    useFoodStore.setState({ customFoods: [] });
    useFoodDiaryStore.setState({ entries: [] });
    useNutritionGoalsStore.setState({
      goals: {
        dailyCalories: 1000,
        protein: 10,
        carbs: 10,
        fat: 10,
        goalType: 'loss',
      },
    });
    useBodyWeightStore.setState({ entries: [] });

    restoreProfileBackup(parsed as Exclude<typeof parsed, string>);

    expect(useProgramStore.getState().programs).toHaveLength(1);
    expect(useProgramStore.getState().programs[0].name).toBe('PPL');
    expect(useProgramStore.getState().exercises).toHaveLength(1);
    expect(useSessionStore.getState().sessions[0].id).toBe('session-1');
    expect(useFoodStore.getState().customFoods[0].id).toBe('food-1');
    expect(useFoodDiaryStore.getState().entries[0].id).toBe('food-entry-1');
    expect(useNutritionGoalsStore.getState().goals.dailyCalories).toBe(2400);
    expect(useBodyWeightStore.getState().entries[0].weight).toBe(80.5);
  });

  it('rejette un JSON invalide', () => {
    expect(parseProfileBackup('not json')).toContain('JSON');
  });

  it('rejette une mauvaise version', () => {
    const result = parseProfileBackup(JSON.stringify({ version: 99, exportedAt: 'now', data: {} }));
    expect(result).toContain('Version');
  });

  it('rejette des donnees manquantes', () => {
    const result = parseProfileBackup(JSON.stringify({ version: 1, exportedAt: 'now', data: {} }));
    expect(result).toContain('programs');
  });
});
