import {
  EQUIPMENT_PROFILES,
  getEquipmentProfile,
  getKnownEquipmentValues,
  isExerciseCompatibleWithProfile,
  migrateGymProfileId,
} from '../equipmentProfiles';
import type { CatalogExercise } from '../../types';

function exercise(overrides: Partial<CatalogExercise>): CatalogExercise {
  return {
    id: 'test',
    name: 'Test exercise',
    bodyPart: 'quadriceps',
    target: 'quadriceps',
    secondaryMuscles: [],
    equipment: 'body only',
    instructions: [],
    gif: { a: 'a.jpg', b: 'b.jpg' },
    ...overrides,
  };
}

const KNOWN_EQUIPMENT = getKnownEquipmentValues();

describe('equipment profiles', () => {
  it('covers every equipment value present in the catalog', () => {
    const covered = new Set(EQUIPMENT_PROFILES.find((p) => p.id === 'full-gym')!.equipment);
    for (const value of KNOWN_EQUIPMENT) {
      expect(covered.has(value)).toBe(true);
    }
  });

  it('maps each profile to its expected equipment coverage', () => {
    const profiles = EQUIPMENT_PROFILES;
    const get = (id: string) => profiles.find((p) => p.id === id)!.equipment;

    expect(get('bodyweight')).toEqual(['body only']);
    expect(get('dumbbells')).toEqual(['dumbbell', 'body only']);
    expect(get('machines')).toEqual(['machine', 'cable', 'body only']);
    expect(get('barbell')).toEqual(['barbell', 'dumbbell', 'e-z curl bar', 'body only']);
  });

  it('keeps common machine exercises available in the machines profile', () => {
    const legPress = exercise({ name: 'Leg Press', equipment: 'machine' });
    const cableRow = exercise({ name: 'Cable Row', equipment: 'cable' });

    expect(isExerciseCompatibleWithProfile(legPress, 'machines')).toBe(true);
    expect(isExerciseCompatibleWithProfile(cableRow, 'machines')).toBe(true);
  });

  it('filters heavy equipment for the bodyweight profile', () => {
    const barbellSquat = exercise({ name: 'Squat', equipment: 'barbell' });
    const dumbbellPress = exercise({ name: 'Shoulder Press', equipment: 'dumbbell' });

    expect(isExerciseCompatibleWithProfile(barbellSquat, 'bodyweight')).toBe(false);
    expect(isExerciseCompatibleWithProfile(dumbbellPress, 'bodyweight')).toBe(false);
  });

  it('always considers bodyweight exercises compatible', () => {
    const pushUp = exercise({ name: 'Push-up', equipment: 'body only' });

    for (const profile of EQUIPMENT_PROFILES) {
      expect(isExerciseCompatibleWithProfile(pushUp, profile.id)).toBe(true);
    }
  });

  it('returns a default profile when id is missing', () => {
    expect(getEquipmentProfile(null).id).toBe('bodyweight');
    expect(getEquipmentProfile(undefined).id).toBe('bodyweight');
    expect(getEquipmentProfile('unknown' as never).id).toBe('bodyweight');
  });

  it('migrates legacy gym profile ids to full-gym', () => {
    expect(migrateGymProfileId('all')).toBe('full-gym');
    expect(migrateGymProfileId('fitness-park')).toBe('full-gym');
    expect(migrateGymProfileId('basic-fit')).toBe('full-gym');
    expect(migrateGymProfileId('unknown-gym')).toBe('full-gym');
    expect(migrateGymProfileId(undefined)).toBeUndefined();
    expect(migrateGymProfileId('bodyweight')).toBe('bodyweight');
  });
});
