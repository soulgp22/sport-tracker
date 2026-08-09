import type { ActivityLevel, PerformanceSex } from '../types/performance';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export interface EnergyProfile {
  sex: PerformanceSex;
  weightKg?: number;
  heightCm?: number;
  ageYears?: number;
  activityLevel: ActivityLevel;
}

export const DEFAULT_STEP_ESTIMATION_WEIGHT_KG = 70;

export const ENERGY_SOURCE_LABEL_KEYS = {
  healthConnectCalories: 'nutrition.balance.sourceHealthConnect',
  healthConnectSteps: 'nutrition.balance.sourceSteps',
  profile: 'nutrition.balance.sourceEstimate',
  unknown: 'nutrition.balance.sourceUnavailable',
} as const;

export type EnergySource = keyof typeof ENERGY_SOURCE_LABEL_KEYS;

export interface StepCaloriesEstimate {
  activeCaloriesKcal: number;
  weightKg: number;
  usedDefaultWeight: boolean;
}

/** Estimation pure des calories actives a partir des pas et du poids. */
export function estimateActiveCaloriesFromSteps(
  steps: number,
  weightKg?: number
): StepCaloriesEstimate {
  const validWeight = weightKg !== undefined && Number.isFinite(weightKg) && weightKg > 0;
  const estimationWeightKg = validWeight ? weightKg : DEFAULT_STEP_ESTIMATION_WEIGHT_KG;
  const normalizedSteps = Number.isFinite(steps) ? Math.max(0, steps) : 0;
  return {
    activeCaloriesKcal: Math.round(normalizedSteps * estimationWeightKg * 0.0005),
    weightKg: estimationWeightKg,
    usedDefaultWeight: !validWeight,
  };
}

export interface DailyEnergyExpenditureInput {
  healthCalories: { active: number; total: number } | null;
  healthSteps: number | null;
  tdee: number | null;
  profileComplete: boolean;
  weightKg?: number;
}

export interface DailyEnergyExpenditure {
  burnedKcal: number | null;
  source: EnergySource;
  sourceLabelKey: (typeof ENERGY_SOURCE_LABEL_KEYS)[EnergySource];
  activeCaloriesKcal?: number;
  activeCaloriesOnly: boolean;
  usedDefaultWeight: boolean;
}

/**
 * Choisit la depense du jour selon la hierarchie produit, sans dependance UI :
 * calories Health Connect, pas Health Connect, profil, puis inconnu.
 */
export function resolveDailyEnergyExpenditure({
  healthCalories,
  healthSteps,
  tdee,
  profileComplete,
  weightKg,
}: DailyEnergyExpenditureInput): DailyEnergyExpenditure {
  const healthCaloriesKcal = healthCalories
    ? healthCalories.total > 0
      ? healthCalories.total
      : healthCalories.active
    : 0;
  if (healthCaloriesKcal > 0) {
    return {
      burnedKcal: healthCaloriesKcal,
      source: 'healthConnectCalories',
      sourceLabelKey: ENERGY_SOURCE_LABEL_KEYS.healthConnectCalories,
      activeCaloriesOnly: false,
      usedDefaultWeight: false,
    };
  }

  if (healthSteps !== null && healthSteps > 0) {
    const estimate = estimateActiveCaloriesFromSteps(healthSteps, weightKg);
    const canUseTdee = profileComplete && tdee !== null && tdee > 0;
    return {
      burnedKcal: (canUseTdee ? tdee : 0) + estimate.activeCaloriesKcal,
      source: 'healthConnectSteps',
      sourceLabelKey: ENERGY_SOURCE_LABEL_KEYS.healthConnectSteps,
      activeCaloriesKcal: estimate.activeCaloriesKcal,
      activeCaloriesOnly: !canUseTdee,
      usedDefaultWeight: estimate.usedDefaultWeight,
    };
  }

  if (profileComplete && tdee !== null && tdee > 0) {
    return {
      burnedKcal: tdee,
      source: 'profile',
      sourceLabelKey: ENERGY_SOURCE_LABEL_KEYS.profile,
      activeCaloriesOnly: false,
      usedDefaultWeight: false,
    };
  }

  return {
    burnedKcal: null,
    source: 'unknown',
    sourceLabelKey: ENERGY_SOURCE_LABEL_KEYS.unknown,
    activeCaloriesOnly: false,
    usedDefaultWeight: false,
  };
}

export type DailyEnergyBalance =
  | { status: 'remaining'; count: number }
  | { status: 'over'; count: number }
  | { status: 'unavailable' };

/** Ne calcule jamais d'excedent a partir d'une depense nulle ou inconnue. */
export function resolveDailyEnergyBalance(
  burnedKcal: number | null,
  consumedKcal: number
): DailyEnergyBalance {
  if (burnedKcal === null || burnedKcal <= 0) return { status: 'unavailable' };
  const difference = burnedKcal - consumedKcal;
  return difference >= 0
    ? { status: 'remaining', count: difference }
    : { status: 'over', count: Math.abs(difference) };
}

/**
 * Métabolisme de base selon Mifflin-St Jeor :
 * BMR = 10 × poids (kg) + 6,25 × taille (cm) − 5 × âge (ans) + s
 * avec s = +5 pour un homme, −161 pour une femme.
 * Retourne null si le profil est incomplet.
 */
export function calculateBmr(profile: EnergyProfile): number | null {
  const { sex, weightKg, heightCm, ageYears } = profile;
  if (sex === 'unspecified') return null;
  if (!weightKg || weightKg <= 0) return null;
  if (!heightCm || heightCm <= 0) return null;
  if (!ageYears || ageYears <= 0) return null;

  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(base + (sex === 'male' ? 5 : -161));
}

/**
 * Dépense énergétique totale estimée sur une journée (TDEE) :
 * BMR × facteur du niveau d'activité. Retourne null si le profil est incomplet.
 */
export function calculateTdee(profile: EnergyProfile): number | null {
  const bmr = calculateBmr(profile);
  if (bmr === null) return null;
  return Math.round(bmr * ACTIVITY_FACTORS[profile.activityLevel]);
}

export function isEnergyProfileComplete(profile: EnergyProfile): boolean {
  return calculateBmr(profile) !== null;
}

/** Champs du profil énergétique qui peuvent manquer au calcul du BMR/TDEE. */
export type EnergyProfileField = 'sex' | 'weight' | 'height' | 'age';

/**
 * Liste les champs manquants empêchant l'estimation de la dépense (TDEE).
 * Le poids est passé à part car il vient du journal de poids
 * (bodyWeightStore), pas du profil de performance.
 * Ordre stable : sexe, poids, taille, âge.
 */
export function missingEnergyProfileFields(
  profile: Pick<EnergyProfile, 'sex' | 'heightCm' | 'ageYears'>,
  weightKg?: number
): EnergyProfileField[] {
  const missing: EnergyProfileField[] = [];
  if (profile.sex === 'unspecified') missing.push('sex');
  if (!weightKg || weightKg <= 0) missing.push('weight');
  if (!profile.heightCm || profile.heightCm <= 0) missing.push('height');
  if (!profile.ageYears || profile.ageYears <= 0) missing.push('age');
  return missing;
}
