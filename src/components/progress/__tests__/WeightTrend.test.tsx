import React from 'react';
import { render, screen } from '@testing-library/react-native';

import {
  getWeightTrendDirection,
  WEIGHT_STABILITY_THRESHOLD_KG,
  WeightTrend,
} from '../WeightTrend';

const entry = (id: string, weight: number): { id: string; date: string; weight: number } => ({
  id,
  date: `2026-08-${id.length === 1 ? '0' : ''}${id}T00:00:00.000Z`,
  weight,
});

describe('getWeightTrendDirection', () => {
  it('renvoie null avec moins de deux pesées', () => {
    expect(getWeightTrendDirection([])).toBeNull();
    expect(getWeightTrendDirection([entry('1', 80)])).toBeNull();
  });

  it('renvoie "up" quand la dernière pesée est supérieure à la précédente', () => {
    expect(getWeightTrendDirection([entry('1', 80), entry('2', 81.7)])).toBe('up');
  });

  it('renvoie "down" quand la dernière pesée est inférieure à la précédente', () => {
    expect(getWeightTrendDirection([entry('1', 81.7), entry('2', 80)])).toBe('down');
  });

  it(`renvoie "stable" quand l'écart est exactement égal au seuil (${WEIGHT_STABILITY_THRESHOLD_KG} kg)`, () => {
    // 0.2 - 0 est exactement 0.2 en virgule flottante, contrairement à
    // 80.2 - 80 qui donne 0.20000000000000284 (bruit de virgule flottante).
    expect(
      getWeightTrendDirection([
        entry('1', 0),
        entry('2', WEIGHT_STABILITY_THRESHOLD_KG),
      ])
    ).toBe('stable');
  });
});

describe('WeightTrend', () => {
  it("ne rend rien avec moins de deux pesées (pas de flèche par défaut)", () => {
    render(<WeightTrend entries={[entry('1', 80)]} />);
    expect(screen.toJSON()).toBeNull();
  });
});
