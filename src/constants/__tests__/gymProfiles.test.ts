import { getExerciseAliases, translateEquipment, translateMuscle } from '../exerciseI18n';
import { isExerciseAvailableAtGym } from '../gymProfiles';
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

describe('gym profiles and exercise translations', () => {
  it('keeps common machine exercises in every supported gym profile', () => {
    const legPress = exercise({ name: 'Leg Press', equipment: 'machine' });

    expect(isExerciseAvailableAtGym(legPress, 'fitness-park')).toBe(true);
    expect(isExerciseAvailableAtGym(legPress, 'basic-fit')).toBe(true);
    expect(isExerciseAvailableAtGym(legPress, 'planet-fitness')).toBe(true);
  });

  it('filters specialized strongman exercises for general-purpose gyms', () => {
    const sled = exercise({ name: 'Heavy Sled Drag', equipment: 'other' });

    expect(isExerciseAvailableAtGym(sled, 'fitness-park')).toBe(true);
    expect(isExerciseAvailableAtGym(sled, 'basic-fit')).toBe(false);
    expect(isExerciseAvailableAtGym(sled, 'planet-fitness')).toBe(false);
  });

  it('translates muscles and equipment in all four languages', () => {
    expect(translateMuscle('shoulders', 'fr')).toBe('Épaules');
    expect(translateMuscle('shoulders', 'es')).toBe('Hombros');
    expect(translateMuscle('shoulders', 'de')).toBe('Schultern');
    expect(translateEquipment('dumbbell', 'en')).toBe('Dumbbells');
  });

  it('exposes modern gym aliases', () => {
    expect(getExerciseAliases('offline-205', 'fr')).toContain('Pec deck');
    expect(getExerciseAliases('offline-574', 'de')).toContain('Beinpresse');
  });
});
