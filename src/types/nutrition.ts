export type FoodUnit = 'g' | 'ml' | 'portion' | 'unité';

export interface FoodNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
}

export interface Food {
  id: string;
  name: string;
  category: string;
  unit: FoodUnit;
  nutritionPer100g: FoodNutrition;
  isCustom: boolean;
}

export type GoalType = 'loss' | 'maintenance' | 'gain';

export interface NutritionGoals {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  goalType: GoalType;
  currentWeight?: number;
  targetWeight?: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface CalculatedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodEntry {
  id: string;
  date: string;
  mealType: MealType;
  foodId: string;
  foodName: string;
  quantity: number;
  unit: FoodUnit;
  calculatedNutrition: CalculatedNutrition;
}
