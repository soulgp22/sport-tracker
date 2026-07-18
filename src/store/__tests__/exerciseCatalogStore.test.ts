import { useExerciseCatalogStore } from '../exerciseCatalogStore';

describe('exerciseCatalogStore', () => {
  it('returns only the exercises required by the starter programs offline', () => {
    const all = useExerciseCatalogStore.getState().all();
    expect(all).toHaveLength(22);
    expect(all[0].id).toBeDefined();
    expect(all[0].name.length).toBeGreaterThan(0);
    expect(all[0].gif.a).toMatch(/-a\.(gif|jpe?g|png)$/);
    expect(all[0].gif.b).toMatch(/-b\.(gif|jpe?g|png)$/);
  });

  it('installs a downloaded GitHub exercise pack without duplicating exercises', () => {
    const store = useExerciseCatalogStore.getState();
    const sample = { ...store.all()[0], id: 'remote-sample', name: 'Remote sample' };
    expect(store.installPack('test-pack', [sample, sample])).toBe(2);
    expect(useExerciseCatalogStore.getState().getById('remote-sample')).toBeDefined();
    expect(useExerciseCatalogStore.getState().all().filter((item) => item.id === sample.id)).toHaveLength(1);
  });

  it('gets an exercise by id (and undefined for unknown)', () => {
    const store = useExerciseCatalogStore.getState();
    const first = store.all()[0];
    expect(store.getById(first.id)?.name).toBe(first.name);
    expect(store.getById('does-not-exist')).toBeUndefined();
  });

  it('searches by name, case-insensitively', () => {
    const store = useExerciseCatalogStore.getState();
    const first = store.all()[0];
    const token = first.name.split(' ')[0];
    const results = store.search(token.toUpperCase());
    expect(results.some((exercise) => exercise.id === first.id)).toBe(true);
    expect(store.search('').length).toBe(store.all().length);
  });

  it('filters by body part', () => {
    const store = useExerciseCatalogStore.getState();
    const bodyPart = store.bodyParts[0];
    const results = store.filterByMuscle(bodyPart);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((exercise) => exercise.bodyPart === bodyPart)).toBe(true);
  });

  it('exposes body parts and equipments', () => {
    const state = useExerciseCatalogStore.getState();
    expect(state.bodyParts).toContain('chest');
    expect(state.equipments).toContain('barbell');
  });
});
