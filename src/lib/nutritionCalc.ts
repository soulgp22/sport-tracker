import { colors } from '../constants/colors';
import type { CalculatedNutrition, Food, FoodEntry, FoodUnit, NutritionGoals } from '../types';

export interface NutritionHistoryDay {
  date: string;
  totals: CalculatedNutrition;
}

export interface NutritionHistory {
  days: NutritionHistoryDay[];
  average: CalculatedNutrition;
}

function roundCalories(value: number) {
  return Math.round(value);
}

function roundMacro(value: number) {
  return Math.round(value * 10) / 10;
}

function roundNutrition(nutrition: CalculatedNutrition): CalculatedNutrition {
  return {
    calories: roundCalories(nutrition.calories),
    protein: roundMacro(nutrition.protein),
    carbs: roundMacro(nutrition.carbs),
    fat: roundMacro(nutrition.fat),
  };
}

function emptyNutrition(): CalculatedNutrition {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function sumNutrition(items: CalculatedNutrition[]): CalculatedNutrition {
  return roundNutrition(
    items.reduce(
      (total, item) => ({
        calories: total.calories + item.calories,
        protein: total.protein + item.protein,
        carbs: total.carbs + item.carbs,
        fat: total.fat + item.fat,
      }),
      emptyNutrition()
    )
  );
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getEntryDateKey(entry: FoodEntry) {
  return entry.date.slice(0, 10);
}

function referenceAmount(unit: FoodUnit): number {
  return unit === 'g' || unit === 'ml' ? 100 : 1;
}

export function calculateNutritionForQuantity(food: Food, quantity: number): CalculatedNutrition {
  const factor = quantity / referenceAmount(food.unit);

  return roundNutrition({
    calories: food.nutritionPer100g.calories * factor,
    protein: food.nutritionPer100g.protein * factor,
    carbs: food.nutritionPer100g.carbs * factor,
    fat: food.nutritionPer100g.fat * factor,
  });
}

export function calculateDailyTotals(entries: FoodEntry[]): CalculatedNutrition {
  return sumNutrition(entries.map((entry) => entry.calculatedNutrition));
}

export function calculateRemainingGoals(
  totals: CalculatedNutrition,
  goals: NutritionGoals
): CalculatedNutrition {
  return roundNutrition({
    calories: goals.dailyCalories - totals.calories,
    protein: goals.protein - totals.protein,
    carbs: goals.carbs - totals.carbs,
    fat: goals.fat - totals.fat,
  });
}

export function calculateGoalProgress(
  totals: CalculatedNutrition,
  goals: NutritionGoals
): CalculatedNutrition {
  const percent = (value: number, goal: number) => (goal > 0 ? Math.round((value / goal) * 100) : 0);

  return {
    calories: percent(totals.calories, goals.dailyCalories),
    protein: percent(totals.protein, goals.protein),
    carbs: percent(totals.carbs, goals.carbs),
    fat: percent(totals.fat, goals.fat),
  };
}

export function getNutritionHistory(entries: FoodEntry[], period: 7 | 30): NutritionHistory {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: period }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (period - 1 - index));
    return formatDateKey(date);
  });
  const daySet = new Set(days);
  const entriesByDate = new Map<string, FoodEntry[]>();

  for (const entry of entries) {
    const dateKey = getEntryDateKey(entry);
    if (!daySet.has(dateKey)) continue;
    entriesByDate.set(dateKey, [...(entriesByDate.get(dateKey) ?? []), entry]);
  }

  const historyDays = days.map((date) => ({
    date,
    totals: calculateDailyTotals(entriesByDate.get(date) ?? []),
  }));
  const periodTotals = sumNutrition(historyDays.map((day) => day.totals));

  return {
    days: historyDays,
    average: roundNutrition({
      calories: periodTotals.calories / period,
      protein: periodTotals.protein / period,
      carbs: periodTotals.carbs / period,
      fat: periodTotals.fat / period,
    }),
  };
}

export function macroStatusColor(percent: number): string {
  if (percent <= 90) return colors.success;
  if (percent <= 100) return colors.secondary;
  return colors.danger;
}
