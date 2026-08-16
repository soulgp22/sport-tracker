import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

import { AnimatedNumber } from '../AnimatedNumber';

describe('AnimatedNumber', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rend la valeur finale immédiatement quand duration vaut 0', () => {
    render(
      <AnimatedNumber
        value={100}
        duration={0}
        format={(v) => String(Math.round(v))}
        testID="number"
      />
    );

    expect(screen.getByTestId('number').props.children).toBe('100');
  });

  it('avec une durée, la valeur affichée à mi-parcours est strictement entre 0 et la valeur finale', () => {
    render(
      <AnimatedNumber value={100} duration={900} format={(v) => String(v)} testID="number" />
    );

    act(() => {
      jest.advanceTimersByTime(450);
    });

    const mid = Number(screen.getByTestId('number').props.children);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
  });

  it('à la fin, la valeur affichée est exactement la valeur finale', () => {
    render(
      <AnimatedNumber value={81.7} duration={900} format={(v) => String(v)} testID="number" />
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('number').props.children).toBe('81.7');
  });
});
