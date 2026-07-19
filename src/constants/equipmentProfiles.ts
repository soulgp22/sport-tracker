import type { CatalogExercise } from '../types';
import type { EquipmentProfileId } from '../types/equipment';

/**
 * Profils de matériel disponible. Chaque profil définit la liste des valeurs
 * `equipment` du catalogue qu'il couvre. Les valeurs sont celles réellement
 * présentes dans src/data/exercises.catalog.json :
 * bands, barbell, body only, cable, dumbbell, e-z curl bar, exercise ball,
 * foam roll, kettlebells, machine, medicine ball, other.
 */
export interface EquipmentProfile {
  id: EquipmentProfileId;
  i18nKey: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  equipment: string[];
}

export const EQUIPMENT_PROFILES: EquipmentProfile[] = [
  {
    id: 'bodyweight',
    i18nKey: 'equipment.bodyweight',
    icon: 'body-outline',
    equipment: ['body only'],
  },
  {
    id: 'home-basic',
    i18nKey: 'equipment.homeBasic',
    icon: 'home-outline',
    equipment: [
      'body only',
      'dumbbell',
      'bands',
      'exercise ball',
      'medicine ball',
      'foam roll',
      'kettlebells',
    ],
  },
  {
    id: 'dumbbells',
    i18nKey: 'equipment.dumbbells',
    icon: 'barbell-outline',
    equipment: ['dumbbell', 'body only'],
  },
  {
    id: 'machines',
    i18nKey: 'equipment.machines',
    icon: 'settings-outline',
    equipment: ['machine', 'cable', 'body only'],
  },
  {
    id: 'barbell',
    i18nKey: 'equipment.barbell',
    icon: 'fitness-outline',
    equipment: ['barbell', 'dumbbell', 'e-z curl bar', 'body only'],
  },
  {
    id: 'full-gym',
    i18nKey: 'equipment.fullGym',
    icon: 'business-outline',
    equipment: [
      'bands',
      'barbell',
      'body only',
      'cable',
      'dumbbell',
      'e-z curl bar',
      'exercise ball',
      'foam roll',
      'kettlebells',
      'machine',
      'medicine ball',
      'other',
    ],
  },
];

const ALL_EQUIPMENT = new Set(EQUIPMENT_PROFILES.find((p) => p.id === 'full-gym')!.equipment);

const profileById = new Map(EQUIPMENT_PROFILES.map((p) => [p.id, p]));

export function getEquipmentProfile(id: EquipmentProfileId | null | undefined): EquipmentProfile {
  return profileById.get(id as EquipmentProfileId) ?? EQUIPMENT_PROFILES[0];
}

export function isExerciseCompatibleWithProfile(
  exercise: CatalogExercise,
  profileId: EquipmentProfileId | null | undefined
): boolean {
  if (!profileId || exercise.equipment === 'body only') return true;
  const profile = getEquipmentProfile(profileId);
  return profile.equipment.includes(exercise.equipment);
}

/**
 * Migration à la lecture des anciens programmes qui utilisaient `gymProfileId`.
 * Toute ancienne valeur (y compris `all`) est considérée comme une salle complète.
 */
export function migrateGymProfileId(
  legacy: string | null | undefined
): EquipmentProfileId | undefined {
  if (!legacy) return undefined;
  if (legacy === 'all') return 'full-gym';
  const mapped = EQUIPMENT_PROFILES.find((p) => p.id === legacy)?.id;
  return mapped ?? 'full-gym';
}

/**
 * Liste exhaustive des valeurs `equipment` connues dans le catalogue.
 * Utile pour les tests et les assertions de couverture.
 */
export function getKnownEquipmentValues(): string[] {
  return [...ALL_EQUIPMENT];
}
