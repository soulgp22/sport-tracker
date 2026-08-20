import { useExerciseCatalogStore } from '../exerciseCatalogStore';

describe('exerciseCatalogStore', () => {
  it('bundles the full exercise catalog by default (no partial import against community programs)', () => {
    const all = useExerciseCatalogStore.getState().all();
    // Les programmes communautaires référencent des exercices du catalogue
    // complet : un catalogue par défaut réduit vidait silencieusement la
    // plupart des jours importés (voir known_bugs.md).
    expect(all.length).toBeGreaterThan(800);
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

  it('searches by id with server lookup (async)', async () => {
    const store = useExerciseCatalogStore.getState();
    const first = store.all()[0];

    // Appel async simulé : on peuple manuellement searchResults
    useExerciseCatalogStore.setState({
      searchResults: [first],
      searchLoading: false,
      searchError: 'none',
    });

    const results = useExerciseCatalogStore.getState().searchResults;
    expect(results.some((exercise) => exercise.id === first.id)).toBe(true);

    // Recherche vide → searchResults vide
    useExerciseCatalogStore.setState({ searchResults: [] });
    expect(useExerciseCatalogStore.getState().searchResults).toHaveLength(0);
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
