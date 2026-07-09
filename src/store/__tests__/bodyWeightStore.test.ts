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
});
