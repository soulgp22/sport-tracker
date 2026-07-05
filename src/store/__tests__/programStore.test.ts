import { useProgramStore } from '../programStore';
import { useExerciseCatalogStore } from '../exerciseCatalogStore';

// Exercice réel du catalogue (pour des fixtures d'import robustes au contenu)
const CATALOG = useExerciseCatalogStore.getState().all();
const KNOWN = CATALOG[0];
const ALT_BY_ID = CATALOG[1];
const ALT_BY_NAME = CATALOG[2];

beforeEach(() => {
  useProgramStore.setState({ programs: [], exercises: [] });
});

describe('programs', () => {
  it('adds a program', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    expect(useProgramStore.getState().programs).toHaveLength(1);
    expect(p.name).toBe('PPL');
    expect(p.days).toEqual([]);
    expect(p.id).toBeDefined();
    expect(p.createdAt).toBeDefined();
    expect(p.updatedAt).toBeDefined();
  });

  it('updates a program name', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    useProgramStore.getState().updateProgram(p.id, { name: 'Push Pull Legs' });
    const updated = useProgramStore.getState().programs[0];
    expect(updated.name).toBe('Push Pull Legs');
  });

  it('deletes a program', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    useProgramStore.getState().deleteProgram(p.id);
    expect(useProgramStore.getState().programs).toHaveLength(0);
  });

  it('handles delete of non-existent program without error', () => {
    useProgramStore.getState().deleteProgram('nonexistent');
    expect(useProgramStore.getState().programs).toHaveLength(0);
  });
});

describe('days', () => {
  it('adds a day to a program', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    const d = useProgramStore.getState().addDay(p.id, 'Push');
    expect(d.name).toBe('Push');
    expect(d.order).toBe(0);
    const program = useProgramStore.getState().programs[0];
    expect(program.days).toHaveLength(1);
  });

  it('updates a day name', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    const d = useProgramStore.getState().addDay(p.id, 'Push');
    useProgramStore.getState().updateDay(p.id, d.id, { name: 'Push Day' });
    const day = useProgramStore.getState().programs[0].days[0];
    expect(day.name).toBe('Push Day');
  });

  it('deletes a day', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    const d = useProgramStore.getState().addDay(p.id, 'Push');
    useProgramStore.getState().deleteDay(p.id, d.id);
    expect(useProgramStore.getState().programs[0].days).toHaveLength(0);
  });

  it('assigns incremental order to days', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    useProgramStore.getState().addDay(p.id, 'Push');
    useProgramStore.getState().addDay(p.id, 'Pull');
    const d2 = useProgramStore.getState().addDay(p.id, 'Legs');
    expect(d2.order).toBe(2);
  });
});

describe('exercises', () => {
  it('adds an exercise to a day', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    const d = useProgramStore.getState().addDay(p.id, 'Push');
    useProgramStore.getState().addExerciseToDay(p.id, d.id, {
      exerciseId: 'ex1',
      exerciseName: 'Bench Press',
      sets: [{ reps: 10, weight: 60, restSeconds: 90 }],
    });
    const day = useProgramStore.getState().programs[0].days[0];
    expect(day.exercises).toHaveLength(1);
    expect(day.exercises[0].exerciseName).toBe('Bench Press');
    expect(day.exercises[0].order).toBe(0);
  });

  it('updates an exercise in a day', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    const d = useProgramStore.getState().addDay(p.id, 'Push');
    useProgramStore.getState().addExerciseToDay(p.id, d.id, {
      exerciseId: 'ex1',
      exerciseName: 'Bench Press',
      sets: [{ reps: 10, weight: 60, restSeconds: 90 }],
    });
    const ex = useProgramStore.getState().programs[0].days[0].exercises[0];
    useProgramStore.getState().updateExerciseInDay(p.id, d.id, ex.id, { exerciseName: 'Incline Bench' });
    expect(useProgramStore.getState().programs[0].days[0].exercises[0].exerciseName).toBe('Incline Bench');
  });

  it('deletes an exercise from a day', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    const d = useProgramStore.getState().addDay(p.id, 'Push');
    useProgramStore.getState().addExerciseToDay(p.id, d.id, {
      exerciseId: 'ex1',
      exerciseName: 'Bench Press',
      sets: [{ reps: 10, weight: 60, restSeconds: 90 }],
    });
    const ex = useProgramStore.getState().programs[0].days[0].exercises[0];
    useProgramStore.getState().deleteExerciseFromDay(p.id, d.id, ex.id);
    expect(useProgramStore.getState().programs[0].days[0].exercises).toHaveLength(0);
  });

  it('assigns incremental order to exercises', () => {
    const p = useProgramStore.getState().addProgram('PPL');
    const d = useProgramStore.getState().addDay(p.id, 'Push');
    useProgramStore.getState().addExerciseToDay(p.id, d.id, {
      exerciseId: 'ex1', exerciseName: 'Bench Press',
      sets: [{ reps: 10, weight: 60, restSeconds: 90 }],
    });
    useProgramStore.getState().addExerciseToDay(p.id, d.id, {
      exerciseId: 'ex2', exerciseName: 'OHP',
      sets: [{ reps: 8, weight: 40, restSeconds: 90 }],
    });
    const ex2 = useProgramStore.getState().programs[0].days[0].exercises[1];
    expect(ex2.order).toBe(1);
  });
});

describe('importPrograms', () => {
  const validJson = () => JSON.stringify({
    version: 1,
    programs: [
      {
        name: 'PPL',
        days: [
          {
            name: 'Push',
            exercises: [
              {
                exerciseName: KNOWN.name,
                sets: [{ reps: 10, weight: 60, restSeconds: 90 }],
              },
            ],
          },
        ],
      },
    ],
  });

  it('imports a valid program', () => {
    const result = useProgramStore.getState().importPrograms(validJson());
    expect(result.importedPrograms).toBe(1);
    expect(result.importedExercises).toBe(1);
    expect(result.errors).toEqual([]);
    expect(result.unknownExercises).toEqual([]);
    expect(useProgramStore.getState().programs).toHaveLength(1);
    expect(useProgramStore.getState().programs[0].name).toBe('PPL');
    expect(useProgramStore.getState().programs[0].days).toHaveLength(1);
    expect(useProgramStore.getState().programs[0].days[0].exercises).toHaveLength(1);
    expect(useProgramStore.getState().programs[0].days[0].exercises[0].exerciseName).toBe(KNOWN.nameFr ?? KNOWN.name);
  });

  it('imports multiple programs', () => {
    const json = JSON.stringify({
      version: 1,
      programs: [
        { name: 'PPL', days: [{ name: 'Push', exercises: [] }] },
        { name: 'Full Body', days: [{ name: 'A', exercises: [] }] },
      ],
    });
    const result = useProgramStore.getState().importPrograms(json);
    expect(result.importedPrograms).toBe(2);
    expect(useProgramStore.getState().programs).toHaveLength(2);
  });

  it('rejects invalid JSON', () => {
    const result = useProgramStore.getState().importPrograms('not json');
    expect(result.importedPrograms).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects missing version', () => {
    const result = useProgramStore.getState().importPrograms(JSON.stringify({ programs: [] }));
    expect(result.importedPrograms).toBe(0);
    expect(result.errors[0]).toContain('Version');
  });

  it('rejects future version', () => {
    const result = useProgramStore.getState().importPrograms(JSON.stringify({ version: 99, programs: [] }));
    expect(result.importedPrograms).toBe(0);
    expect(result.errors[0]).toContain('non supportée');
  });

  it('rejects empty programs array', () => {
    const result = useProgramStore.getState().importPrograms(JSON.stringify({ version: 1, programs: [] }));
    expect(result.importedPrograms).toBe(0);
    expect(result.errors[0]).toContain('Aucun programme');
  });

  it('rejects program with empty name and continues with others', () => {
    const json = JSON.stringify({
      version: 1,
      programs: [
        { name: '', days: [{ name: 'A', exercises: [] }] },
        { name: 'Valid', days: [{ name: 'B', exercises: [] }] },
      ],
    });
    const result = useProgramStore.getState().importPrograms(json);
    expect(result.importedPrograms).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('nom manquant');
  });

  it('generates new unique IDs for imported programs', () => {
    useProgramStore.getState().importPrograms(validJson());
    useProgramStore.getState().importPrograms(validJson());
    expect(useProgramStore.getState().programs).toHaveLength(2);
    expect(useProgramStore.getState().programs[0].id).not.toBe(useProgramStore.getState().programs[1].id);
  });

  it('handles programs with missing optional fields using defaults', () => {
    const json = JSON.stringify({
      version: 1,
      programs: [
        {
          name: 'Minimal',
          days: [
            {
              exercises: [{
                exerciseName: 'Bench',
                sets: [{ reps: 10 }],
              }],
            },
          ],
        },
      ],
    });
    const result = useProgramStore.getState().importPrograms(json);
    expect(result.importedPrograms).toBe(1);
    const program = useProgramStore.getState().programs[0];
    expect(program.days[0].name).toBe('Jour 1');
    expect(program.days[0].exercises).toHaveLength(0);
    expect(result.unknownExercises).toEqual(['Bench']);
  });

  it('appends to existing programs without removing them', () => {
    useProgramStore.getState().addProgram('Existing');
    useProgramStore.getState().importPrograms(validJson());
    expect(useProgramStore.getState().programs).toHaveLength(2);
  });

  it('previews imports without mutating state', () => {
    const result = useProgramStore.getState().importPrograms(validJson(), { commit: false });
    expect(result.importedPrograms).toBe(1);
    expect(result.importedExercises).toBe(1);
    expect(useProgramStore.getState().programs).toHaveLength(0);
  });

  it('imports known exercises by catalog id and skips unknown exercises', () => {
    const json = JSON.stringify({
      version: 1,
      programs: [
        {
          name: 'Mixed',
          days: [
            {
              name: 'A',
              exercises: [
                {
                  exerciseId: KNOWN.id,
                  exerciseName: 'Ignored stale name',
                  sets: [{ reps: 8, weight: 70, restSeconds: 120 }],
                },
                {
                  exerciseName: 'Made Up Lift',
                  sets: [{ reps: 10, weight: 10, restSeconds: 60 }],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = useProgramStore.getState().importPrograms(json);
    expect(result.importedPrograms).toBe(1);
    expect(result.importedExercises).toBe(1);
    expect(result.unknownExercises).toEqual(['Made Up Lift']);
    expect(result.skipped).toBe(1);
    const exercise = useProgramStore.getState().programs[0].days[0].exercises[0];
    expect(exercise.exerciseId).toBe(KNOWN.id);
    expect(exercise.exerciseName).toBe(KNOWN.nameFr ?? KNOWN.name);
  });

  it('imports valid alternatives by id and name while ignoring unresolved alternatives', () => {
    const json = JSON.stringify({
      version: 1,
      programs: [
        {
          name: 'Alternatives',
          days: [
            {
              name: 'A',
              exercises: [
                {
                  exerciseName: KNOWN.name,
                  alternativeExerciseIds: [ALT_BY_ID.id, 'missing-alternative-id'],
                  alternativeExerciseNames: [ALT_BY_NAME.name, 'Missing Alternative'],
                  sets: [{ reps: 10, weight: 60, restSeconds: 90 }],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = useProgramStore.getState().importPrograms(json);

    expect(result.importedPrograms).toBe(1);
    expect(result.importedExercises).toBe(1);
    expect(result.unknownExercises).toEqual([]);
    expect(result.skipped).toBe(0);
    const exercise = useProgramStore.getState().programs[0].days[0].exercises[0];
    expect(exercise.exerciseId).toBe(KNOWN.id);
    expect(exercise.alternativeExerciseIds).toEqual([ALT_BY_ID.id, ALT_BY_NAME.id]);
  });
});

describe('exercise library', () => {
  it('adds an exercise to the library', () => {
    const ex = useProgramStore.getState().addExercise('Bench Press', 'Chest');
    expect(ex.name).toBe('Bench Press');
    expect(ex.muscleGroup).toBe('Chest');
    expect(useProgramStore.getState().exercises).toHaveLength(1);
  });

  it('updates an exercise in the library', () => {
    const ex = useProgramStore.getState().addExercise('Bench Press', 'Chest');
    useProgramStore.getState().updateExercise(ex.id, { muscleGroup: 'Triceps' });
    expect(useProgramStore.getState().exercises[0].muscleGroup).toBe('Triceps');
  });
});
