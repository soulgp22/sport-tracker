import { resolveHealthWeightMerge } from '../healthWeightMerge';
import type { WeightEntry } from '../../types';

function manual(id: string, date: string, weight: number): WeightEntry {
  return { id, date, weight, source: 'manual' };
}

function fromHealth(id: string, date: string, weight: number): WeightEntry {
  return { id, date, weight, source: 'healthConnect' };
}

describe('resolveHealthWeightMerge — le plus récent gagne', () => {
  it('ajoute le relevé quand aucune pesée n’existe ce jour-là', () => {
    const decision = resolveHealthWeightMerge([], {
      weightKg: 78.4,
      time: '2026-08-27T07:12:00.000Z',
    });

    expect(decision).toEqual({
      action: 'add',
      date: '2026-08-27T07:12:00.000Z',
      weight: 78.4,
    });
  });

  it('laisse intacte une saisie manuelle plus récente du même jour', () => {
    const entries = [manual('w1', '2026-08-27T20:00:00.000Z', 79)];

    const decision = resolveHealthWeightMerge(entries, {
      weightKg: 78.4,
      time: '2026-08-27T07:12:00.000Z',
    });

    expect(decision).toEqual({ action: 'skip', reason: 'sameDayIsFresher' });
  });

  it('remplace une pesée plus ancienne du même jour, en gardant son id', () => {
    const entries = [manual('w1', '2026-08-27T07:00:00.000Z', 79)];

    const decision = resolveHealthWeightMerge(entries, {
      weightKg: 78.4,
      time: '2026-08-27T20:00:00.000Z',
    });

    expect(decision).toEqual({
      action: 'replace',
      id: 'w1',
      date: '2026-08-27T20:00:00.000Z',
      weight: 78.4,
    });
  });

  it('est idempotent : re-synchroniser le même relevé n’écrit rien', () => {
    const entries = [fromHealth('w1', '2026-08-27T07:12:00.000Z', 78.4)];

    const decision = resolveHealthWeightMerge(entries, {
      weightKg: 78.4,
      time: '2026-08-27T07:12:00.000Z',
    });

    expect(decision).toEqual({ action: 'skip', reason: 'alreadyStored' });
  });

  it('n’écrase pas la pesée d’un autre jour : un relevé ancien reste de l’historique', () => {
    // Cas concret : dernier poids Health Connect vieux de trois semaines,
    // pesée saisie hier. Le relevé ancien est ajoute a l'historique, mais
    // c'est la saisie d'hier qui reste la plus recente — donc affichee.
    const entries = [manual('w1', '2026-08-26T20:00:00.000Z', 79)];

    const decision = resolveHealthWeightMerge(entries, {
      weightKg: 82,
      time: '2026-08-05T09:00:00.000Z',
    });

    expect(decision).toEqual({
      action: 'add',
      date: '2026-08-05T09:00:00.000Z',
      weight: 82,
    });
  });

  it('traite une entrée sans `source` (créée avant Health Connect) comme une saisie', () => {
    const legacy: WeightEntry = {
      id: 'w0',
      date: '2026-08-27T21:00:00.000Z',
      weight: 80,
    };

    const decision = resolveHealthWeightMerge([legacy], {
      weightKg: 78.4,
      time: '2026-08-27T07:12:00.000Z',
    });

    expect(decision).toEqual({ action: 'skip', reason: 'sameDayIsFresher' });
  });
});
