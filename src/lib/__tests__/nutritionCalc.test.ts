import { colors } from '../../constants/colors';
import type { Food, FoodEntry, NutritionGoals } from '../../types';
import {
  calculateDailyTotals,
  calculateGoalProgress,
  calculateNutritionForQuantity,
  calculateRemainingGoals,
  getCalorieTrend,
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

const oeuf: Food = {
  id: 'oeuf',
  name: 'Oeuf',
  category: 'Protéines',
  unit: 'unité',
  nutritionPer100g: { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
  isCustom: true,
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

  it('calcule la nutrition par unité', () => {
    expect(calculateNutritionForQuantity(oeuf, 2)).toEqual({
      calories: 156,
      protein: 12.6,
      carbs: 1.2,
      fat: 10.6,
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

  it('construit une tendance calories journalière sur 7 jours', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-05T12:00:00.000Z'));

    const trend = getCalorieTrend(
      [
        makeEntry({ id: 'today', date: '2026-07-05', calculatedNutrition: { calories: 700, protein: 30, carbs: 90, fat: 20 } }),
        makeEntry({ id: 'past-1', date: '2026-07-03', calculatedNutrition: { calories: 250, protein: 12, carbs: 35, fat: 8 } }),
        makeEntry({ id: 'past-2', date: '2026-07-03T08:00:00.000Z', calculatedNutrition: { calories: 100, protein: 8, carbs: 10, fat: 4 } }),
        makeEntry({ id: 'ignored', date: '2026-06-20', calculatedNutrition: { calories: 999, protein: 99, carbs: 99, fat: 99 } }),
      ],
      7,
      'day'
    );

    expect(trend.points).toHaveLength(7);
    expect(trend.points.map((point) => point.label)).toEqual([
      '29/06',
      '30/06',
      '01/07',
      '02/07',
      '03/07',
      '04/07',
      '05/07',
    ]);
    expect(trend.points[4]).toEqual({ label: '03/07', calories: 350 });
    expect(trend.points[6]).toEqual({ label: '05/07', calories: 700 });
    expect(trend.averagePerDay).toBe(150);
  });

  it('agrège une tendance calories mensuelle sur 1 an', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-05T12:00:00.000Z'));

    const trend = getCalorieTrend(
      [
        makeEntry({ id: 'july-2026', date: '2026-07-05', calculatedNutrition: { calories: 900, protein: 40, carbs: 100, fat: 25 } }),
        makeEntry({ id: 'ignored', date: '2025-07-01', calculatedNutrition: { calories: 500, protein: 20, carbs: 50, fat: 10 } }),
      ],
      365,
      'month'
    );
    const lastPoint = trend.points[trend.points.length - 1];

    expect(trend.points.length).toBeLessThanOrEqual(13);
    expect(lastPoint).toEqual({ label: 'juil.', calories: 900 });
    expect(trend.averagePerDay).toBe(2);
  });

  it('renvoie la couleur de statut macro', () => {
    expect(macroStatusColor(80)).toBe(colors.success);
    expect(macroStatusColor(95)).toBe(colors.secondary);
    expect(macroStatusColor(101)).toBe(colors.danger);
  });
});
