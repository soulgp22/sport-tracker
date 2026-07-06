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

export type TrendBucket = 'day' | 'week' | 'month';

export interface CalorieTrendPoint {
  label: string;
  calories: number;
}

export interface CalorieTrend {
  points: CalorieTrendPoint[];
  averagePerDay: number;
}

const FRENCH_MONTH_LABELS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

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

function getRecentDateKeys(period: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: period }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (period - 1 - index));
    return formatDateKey(date);
  });
}

function getEntryDateKey(entry: FoodEntry) {
  return entry.date.slice(0, 10);
}

function formatDayMonthLabel(dateKey: string) {
  const [, month, day] = dateKey.split('-');
  return `${day}/${month}`;
}

function formatMonthLabel(dateKey: string) {
  const monthIndex = Number(dateKey.slice(5, 7)) - 1;
  return FRENCH_MONTH_LABELS[monthIndex] ?? '';
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
  const days = getRecentDateKeys(period);
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

export function getCalorieTrend(
  entries: FoodEntry[],
  days: number,
  bucket: TrendBucket
): CalorieTrend {
  const dateKeys = getRecentDateKeys(days);
  const daySet = new Set(dateKeys);
  const caloriesByDate = new Map<string, number>();

  for (const dateKey of dateKeys) {
    caloriesByDate.set(dateKey, 0);
  }

  for (const entry of entries) {
    const dateKey = getEntryDateKey(entry);
    if (!daySet.has(dateKey)) continue;
    caloriesByDate.set(
      dateKey,
      (caloriesByDate.get(dateKey) ?? 0) + entry.calculatedNutrition.calories
    );
  }

  const dailyCalories = dateKeys.map((date) => ({
    date,
    calories: caloriesByDate.get(date) ?? 0,
  }));
  const totalCalories = dailyCalories.reduce((total, day) => total + day.calories, 0);

  if (bucket === 'day') {
    return {
      points: dailyCalories.map((day) => ({
        label: formatDayMonthLabel(day.date),
        calories: roundCalories(day.calories),
      })),
      averagePerDay: roundCalories(totalCalories / days),
    };
  }

  if (bucket === 'week') {
    const points: CalorieTrendPoint[] = [];

    for (let index = 0; index < dailyCalories.length; index += 7) {
      const chunk = dailyCalories.slice(index, index + 7);
      const calories = chunk.reduce((total, day) => total + day.calories, 0);
      points.push({
        label: formatDayMonthLabel(chunk[0].date),
        calories: roundCalories(calories),
      });
    }

    return {
      points,
      averagePerDay: roundCalories(totalCalories / days),
    };
  }

  const monthlyPoints = new Map<string, CalorieTrendPoint>();

  for (const day of dailyCalories) {
    const monthKey = day.date.slice(0, 7);
    const point = monthlyPoints.get(monthKey);

    if (point) {
      point.calories += day.calories;
    } else {
      monthlyPoints.set(monthKey, {
        label: formatMonthLabel(day.date),
        calories: day.calories,
      });
    }
  }

  return {
    points: Array.from(monthlyPoints.values()).map((point) => ({
      label: point.label,
      calories: roundCalories(point.calories),
    })),
    averagePerDay: roundCalories(totalCalories / days),
  };
}

export function macroStatusColor(percent: number): string {
  if (percent <= 90) return colors.success;
  if (percent <= 100) return colors.secondary;
  return colors.danger;
}
