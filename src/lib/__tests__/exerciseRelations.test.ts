import { analyzeProgramCompatibility, getRelatedExerciseIds } from '../exerciseRelations';
import { getCatalogExercise, useExerciseCatalogStore } from '../../store/exerciseCatalogStore';
import remoteCatalog from '../../../community/exercises-all.json';
import type { Program } from '../../types';

const SLED_ROW_ID = 'offline-497';

beforeAll(() => {
  useExerciseCatalogStore.getState().installPack('test-remote-pack', remoteCatalog.exercises);
});

describe('exercise relations', () => {
  it('suggests an available movement alternative for a gym', () => {
    const suggestions = getRelatedExerciseIds(SLED_ROW_ID, 'basic-fit', 5);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).not.toContain(SLED_ROW_ID);
    expect(suggestions.every((id) => getCatalogExercise(id))).toBe(true);
  });

  it('prioritizes a manually linked alternative during compatibility analysis', () => {
    const manualAlternativeId = getRelatedExerciseIds(SLED_ROW_ID, 'basic-fit', 1)[0];
    expect(manualAlternativeId).toBeDefined();

    const program: Program = {
      id: 'program',
      name: 'Pull',
      gymProfileId: 'all',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      days: [
        {
          id: 'day',
          name: 'Dos',
          order: 0,
          exercises: [
            {
              id: 'program-exercise',
              exerciseId: SLED_ROW_ID,
              exerciseName: 'Sled Row',
              alternativeExerciseIds: [manualAlternativeId],
              order: 0,
              sets: [{ reps: 10, weight: 0, restSeconds: 90 }],
            },
          ],
        },
      ],
    };

    const result = analyzeProgramCompatibility(program, 'basic-fit');

    expect(result.compatible).toBe(0);
    expect(result.replaceable).toBe(1);
    expect(result.unresolved).toBe(0);
    expect(result.issues[0]).toMatchObject({
      exerciseId: SLED_ROW_ID,
      replacementId: manualAlternativeId,
      replacementSource: 'manual',
    });
  });
});
