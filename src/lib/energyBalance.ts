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

export const BASAL_SOURCE_LABEL_KEYS = {
  profile: 'nutrition.balance.basalProfile',
  unknown: 'nutrition.balance.sourceUnavailable',
} as const;

export const ACTIVITY_SOURCE_LABEL_KEYS = {
  healthConnectActive: 'nutrition.balance.activityHealthConnectActive',
  healthConnectDerived: 'nutrition.balance.activityHealthConnectDerived',
  steps: 'nutrition.balance.activitySteps',
  habitualEstimate: 'nutrition.balance.activityHabitualEstimate',
  unknown: 'nutrition.balance.sourceUnavailable',
} as const;

export type BasalSource = keyof typeof BASAL_SOURCE_LABEL_KEYS;
export type ActivitySource = keyof typeof ACTIVITY_SOURCE_LABEL_KEYS;

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

export interface DailyEnergyExpenditure {
  basalKcal: number | null;
  activityKcal: number | null;
  totalKcal: number | null;
  basalSource: BasalSource;
  activitySource: ActivitySource;
  basalSourceLabelKey: (typeof BASAL_SOURCE_LABEL_KEYS)[BasalSource];
  activitySourceLabelKey: (typeof ACTIVITY_SOURCE_LABEL_KEYS)[ActivitySource];
  /** true when activityKcal does not come from any real measurement */
  activityIsEstimated: boolean;
  usedDefaultWeight: boolean;
}

/**
 * Decomposes daily energy expenditure into basal metabolism (BMR) and
 * activity calories, following a strict source hierarchy:
 *
 * Activity source, in priority order:
 * 1. healthCalories.active > 0          → healthConnectActive (measured)
 * 2. healthCalories.total > 0 & BMR     → healthConnectDerived (total - BMR)
 * 3. healthSteps > 0                    → steps (estimated from steps)
 * 4. BMR known, no HC data              → habitualEstimate (BMR × (factor - 1))
 * 5. otherwise                          → unknown (null)
 *
 * totalKcal = basalKcal + activityKcal, null when basalKcal is null.
 * Never returns a total without a known basal metabolism.
 */
export function resolveDailyEnergyExpenditure({
  healthCalories,
  healthSteps,
  profile,
}: {
  healthCalories: { active: number; total: number } | null;
  healthSteps: number | null;
  profile: EnergyProfile;
}): DailyEnergyExpenditure {
  const bmr = calculateBmr(profile);
  const weightKg = profile.weightKg;

  const basalKcal = bmr;
  const basalSource: BasalSource = bmr !== null ? 'profile' : 'unknown';

  let activityKcal: number | null = null;
  let activitySource: ActivitySource = 'unknown';
  let usedDefaultWeight = false;

  // 1. Active calories from Health Connect (measured)
  if (healthCalories && healthCalories.active > 0) {
    activityKcal = healthCalories.active;
    activitySource = 'healthConnectActive';
  }
  // 2. Derive from total calories (total - BMR), BMR required
  else if (healthCalories && healthCalories.total > 0 && bmr !== null) {
    activityKcal = Math.max(0, healthCalories.total - bmr);
    activitySource = 'healthConnectDerived';
  }
  // 3. Estimate from steps
  else if (healthSteps !== null && healthSteps > 0) {
    const estimate = estimateActiveCaloriesFromSteps(healthSteps, weightKg);
    activityKcal = estimate.activeCaloriesKcal;
    activitySource = 'steps';
    usedDefaultWeight = estimate.usedDefaultWeight;
  }
  // 4. Habitual estimate from activity level
  else if (bmr !== null) {
    const factor = ACTIVITY_FACTORS[profile.activityLevel];
    activityKcal = Math.round(bmr * (factor - 1));
    activitySource = 'habitualEstimate';
  }
  // 5. Unknown — no usable data
  else {
    activityKcal = null;
    activitySource = 'unknown';
  }

  const totalKcal = basalKcal !== null ? basalKcal + (activityKcal ?? 0) : null;

  const activityIsEstimated =
    activitySource === 'steps' ||
    activitySource === 'habitualEstimate' ||
    activitySource === 'unknown';

  return {
    basalKcal,
    activityKcal,
    totalKcal,
    basalSource,
    activitySource,
    basalSourceLabelKey: BASAL_SOURCE_LABEL_KEYS[basalSource],
    activitySourceLabelKey: ACTIVITY_SOURCE_LABEL_KEYS[activitySource],
    activityIsEstimated,
    usedDefaultWeight,
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
