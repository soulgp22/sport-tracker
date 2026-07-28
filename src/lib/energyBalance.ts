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
