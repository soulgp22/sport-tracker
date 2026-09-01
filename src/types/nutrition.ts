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
  brand?: string;
  retailer?: string;
  country?: string;
  category: string;
  unit: FoodUnit;
  nutritionPer100g: FoodNutrition;
  /** Poids moyen d'une unité en grammes (ex. 1 œuf ≈ 55 g), pour les aliments en g/ml loggables à la pièce. */
  unitWeightGrams?: number;
  barcode?: string;
  sourceUrl?: string;
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

export interface WeightEntry {
  id: string;
  date: string; // ISO date, comme FoodEntry.date
  weight: number; // kg
  /**
   * Origine de la pesee. Absent sur les entrees creees avant l'integration
   * Health Connect : elles sont toutes des saisies manuelles, et le code doit
   * traiter `undefined` comme 'manual' plutot que d'exiger une migration.
   */
  source?: WeightEntrySource;
}

export type WeightEntrySource = 'manual' | 'healthConnect';

/**
 * Groupe de repas. Les 4 valeurs classiques ('breakfast' | 'lunch' | 'dinner' |
 * 'snack') restent supportées, mais l'utilisateur peut créer des groupes
 * personnalisés : n'importe quelle chaîne non vide est valide (ex. "Post-workout").
 */
export type MealType = string;

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
