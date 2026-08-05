import type { FoodEntry, MealType } from '../types';

/** Libellés des groupes classiques (clés i18n : nutrition.add.meal.<type>). */
export const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

/** Ordre d'affichage des groupes classiques quand ils existent. */
export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const CLASSIC_SET = new Set(MEAL_ORDER);

export function isClassicMealType(mealType: MealType): boolean {
  return CLASSIC_SET.has(mealType);
}

/**
 * Libellé d'un groupe de repas : traduction i18n pour les groupes classiques,
 * nom tel quel pour les groupes personnalisés.
 */
export function mealTypeLabel(mealType: MealType, t: (key: string) => string): string {
  if (isClassicMealType(mealType)) {
    return t(`nutrition.add.meal.${mealType}`);
  }
  return mealType;
}

/**
 * Liste ordonnée des groupes présents dans des entrées : classiques d'abord
 * (ordre MEAL_ORDER), puis groupes personnalisés par ordre alphabétique
 * (insensible à la casse).
 */
export function collectMealGroups(entries: Pick<FoodEntry, 'mealType'>[]): MealType[] {
  const present = new Set<MealType>();
  for (const entry of entries) {
    if (entry.mealType) present.add(entry.mealType);
  }
  const classics = MEAL_ORDER.filter((m) => present.has(m));
  const customs = [...present]
    .filter((m) => !CLASSIC_SET.has(m))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return [...classics, ...customs];
}
