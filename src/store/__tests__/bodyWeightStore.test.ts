import AsyncStorage from '@react-native-async-storage/async-storage';

import { useBodyWeightStore } from '../bodyWeightStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  useBodyWeightStore.setState({ entries: [] });
});

describe('bodyWeightStore', () => {
  it('ajoute une entree de poids', () => {
    const entry = useBodyWeightStore.getState().addEntry(82.5, '2026-07-09T08:00:00.000Z');

    expect(entry.weight).toBe(82.5);
    expect(entry.date).toBe('2026-07-09T08:00:00.000Z');
    expect(entry.id).toMatch(/^body_weight_/);
    expect(useBodyWeightStore.getState().entries).toEqual([entry]);
  });

  it('remplace une entree du meme jour', () => {
    const first = useBodyWeightStore.getState().addEntry(82.5, '2026-07-09T08:00:00.000Z');
    const second = useBodyWeightStore.getState().addEntry(82.1, '2026-07-09T19:00:00.000Z');

    expect(useBodyWeightStore.getState().entries).toHaveLength(1);
    expect(second.id).toBe(first.id);
    expect(useBodyWeightStore.getState().entries[0]).toEqual(second);
    expect(useBodyWeightStore.getState().entries[0].weight).toBe(82.1);
  });

  it('supprime une entree', () => {
    const entry = useBodyWeightStore.getState().addEntry(82.5, '2026-07-09T08:00:00.000Z');

    useBodyWeightStore.getState().deleteEntry(entry.id);

    expect(useBodyWeightStore.getState().entries).toEqual([]);
  });

  it('marque les saisies manuelles comme telles', () => {
    const entry = useBodyWeightStore.getState().addEntry(82.5, '2026-07-09T08:00:00.000Z');

    expect(entry.source).toBe('manual');
  });
});

describe('bodyWeightStore — synchronisation Health Connect', () => {
  it('cree une entree marquee healthConnect', () => {
    const changed = useBodyWeightStore
      .getState()
      .syncHealthWeight({ weightKg: 78.4, time: '2026-07-09T07:00:00.000Z' });

    expect(changed).toBe(true);
    const [entry] = useBodyWeightStore.getState().entries;
    expect(entry).toMatchObject({
      weight: 78.4,
      date: '2026-07-09T07:00:00.000Z',
      source: 'healthConnect',
    });
  });

  it('n ecrase pas une saisie manuelle plus recente du meme jour', () => {
    const manual = useBodyWeightStore
      .getState()
      .addEntry(82.5, '2026-07-09T20:00:00.000Z');

    const changed = useBodyWeightStore
      .getState()
      .syncHealthWeight({ weightKg: 78.4, time: '2026-07-09T07:00:00.000Z' });

    expect(changed).toBe(false);
    expect(useBodyWeightStore.getState().entries).toEqual([manual]);
  });

  it('remplace une pesee plus ancienne du meme jour en gardant son id', () => {
    const manual = useBodyWeightStore
      .getState()
      .addEntry(82.5, '2026-07-09T07:00:00.000Z');

    useBodyWeightStore
      .getState()
      .syncHealthWeight({ weightKg: 78.4, time: '2026-07-09T20:00:00.000Z' });

    const entries = useBodyWeightStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(manual.id);
    expect(entries[0].weight).toBe(78.4);
    expect(entries[0].source).toBe('healthConnect');
  });

  it('ne reecrit rien quand le meme releve revient (retour sur l ecran)', () => {
    const sample = { weightKg: 78.4, time: '2026-07-09T07:00:00.000Z' };
    useBodyWeightStore.getState().syncHealthWeight(sample);
    const before = useBodyWeightStore.getState().entries;

    const changed = useBodyWeightStore.getState().syncHealthWeight(sample);

    expect(changed).toBe(false);
    expect(useBodyWeightStore.getState().entries).toBe(before);
  });

  it('laisse la saisie la plus recente gouverner l affichage', () => {
    // Poids Health Connect vieux de trois semaines, pesee saisie hier :
    // les deux entrent dans l'historique, la plus recente reste la derniere.
    useBodyWeightStore.getState().addEntry(79, '2026-07-09T20:00:00.000Z');
    useBodyWeightStore
      .getState()
      .syncHealthWeight({ weightKg: 82, time: '2026-06-18T09:00:00.000Z' });

    const entries = useBodyWeightStore.getState().entries;
    expect(entries).toHaveLength(2);
    expect(entries.at(-1)).toMatchObject({ weight: 79, source: 'manual' });
  });
});
