import { colors } from '../../constants/colors';
import type { Food, FoodEntry, NutritionGoals } from '../../types';
import {
  calculateDailyTotals,
  calculateGoalProgress,
  calculateNutritionForQuantity,
  calculateRemainingGoals,
  getNutritionHistory,
  macroStatusColor,
} from '../nutritionCalc';

const rizCuit: Food = {
  id: 'riz_cuit',
  name: 'Riz cuit',
  category: 'Féculents',
  unit: 'g',
  nutritionPer100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
  isCustom: false,
};

const goals: NutritionGoals = {
  dailyCalories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  goalType: 'maintenance',
};

function makeEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: 'entry-1',
    date: '2026-07-05',
    mealType: 'lunch',
    foodId: 'riz_cuit',
    foodName: 'Riz cuit',
    quantity: 100,
    unit: 'g',
    calculatedNutrition: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
    ...overrides,
  };
}

afterEach(() => {
  jest.useRealTimers();
});

describe('nutritionCalc', () => {
  it('calcule la nutrition pour une quantité', () => {
    expect(calculateNutritionForQuantity(rizCuit, 200)).toEqual({
      calories: 260,
      protein: 5.4,
      carbs: 56.4,
      fat: 0.6,
    });
  });

  it('somme les totaux de la journée', () => {
    const totals = calculateDailyTotals([
      makeEntry({ calculatedNutrition: { calories: 260, protein: 5.4, carbs: 56.4, fat: 0.6 } }),
      makeEntry({ id: 'entry-2', calculatedNutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } }),
    ]);

    expect(totals).toEqual({ calories: 425, protein: 36.4, carbs: 56.4, fat: 4.2 });
  });

  it('calcule les objectifs restants, y compris en dépassement', () => {
    expect(
      calculateRemainingGoals(
        { calories: 2100, protein: 120, carbs: 220, fat: 40 },
        goals
      )
    ).toEqual({ calories: -100, protein: 30, carbs: -20, fat: 25 });
  });

  it('calcule les pourcentages de progression', () => {
    expect(
      calculateGoalProgress(
        { calories: 1000, protein: 150, carbs: 220, fat: 32.5 },
        goals
      )
    ).toEqual({ calories: 50, protein: 100, carbs: 110, fat: 50 });
  });

  it('construit un historique sur 7 jours avec moyenne journalière', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-05T12:00:00.000Z'));

    const history = getNutritionHistory(
      [
        makeEntry({ id: 'today', date: '2026-07-05', calculatedNutrition: { calories: 700, protein: 30, carbs: 90, fat: 20 } }),
        makeEntry({ id: 'past', date: '2026-07-03', calculatedNutrition: { calories: 350, protein: 20, carbs: 40, fat: 10 } }),
        makeEntry({ id: 'ignored', date: '2026-06-20', calculatedNutrition: { calories: 999, protein: 99, carbs: 99, fat: 99 } }),
      ],
      7
    );

    expect(history.days).toHaveLength(7);
    expect(history.days[0].date).toBe('2026-06-29');
    expect(history.days[4]).toEqual({
      date: '2026-07-03',
      totals: { calories: 350, protein: 20, carbs: 40, fat: 10 },
    });
    expect(history.days[6]).toEqual({
      date: '2026-07-05',
      totals: { calories: 700, protein: 30, carbs: 90, fat: 20 },
    });
    expect(history.average).toEqual({ calories: 150, protein: 7.1, carbs: 18.6, fat: 4.3 });
  });

  it('renvoie la couleur de statut macro', () => {
    expect(macroStatusColor(80)).toBe(colors.success);
    expect(macroStatusColor(95)).toBe(colors.secondary);
    expect(macroStatusColor(101)).toBe(colors.danger);
  });
});
