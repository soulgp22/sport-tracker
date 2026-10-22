/**
 * Affichage de la depense estimee sur la fiche d'une seance.
 *
 * Verifie le CABLAGE, la formule elle-meme etant couverte par
 * `lib/__tests__/sessionCalories.test.ts` : poids lu a la DATE de la seance,
 * fourchette affichee, et mention du poids par defaut quand il manque.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import SessionDetailScreen from '../[id]';
import { useSessionStore } from '../../../../store/sessionStore';
import { useBodyWeightStore } from '../../../../store/bodyWeightStore';
import { useLanguageStore } from '../../../../store/languageStore';
import { estimateSessionCalories } from '../../../../lib/sessionCalories';
import type { Session } from '../../../../types';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 's1' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, rest, children),
  };
});

jest.mock('../../../../components/exercises/ExerciseThumbnail', () => ({
  ExerciseThumbnail: () => null,
}));

const SESSION: Session = {
  id: 's1',
  date: '2026-03-10T18:00:00.000Z',
  durationSeconds: 3600,
  exercises: [
    {
      exerciseId: 'offline-001',
      exerciseName: 'Squat',
      sets: Array.from({ length: 16 }, () => ({
        targetReps: 10,
        targetWeight: 50,
        targetRestSeconds: 90,
        actualReps: 10,
        actualWeight: 50,
        completed: true,
      })),
    },
  ],
};

beforeEach(() => {
  useLanguageStore.setState({ language: 'fr' });
  useSessionStore.setState({ sessions: [SESSION] });
});

describe('Fiche seance — depense estimee', () => {
  it('calcule avec le poids en vigueur a la date de la seance, pas le poids actuel', () => {
    useBodyWeightStore.setState({
      entries: [
        { id: 'w1', date: '2026-03-01T08:00:00.000Z', weight: 90, source: 'manual' },
        { id: 'w2', date: '2026-09-01T08:00:00.000Z', weight: 70, source: 'manual' },
      ],
    });

    render(<SessionDetailScreen />);

    const expected = estimateSessionCalories(SESSION, 90)!;
    const withCurrentWeight = estimateSessionCalories(SESSION, 70)!;
    expect(expected.kcal).not.toBe(withCurrentWeight.kcal);
    expect(screen.getByTestId('session-calories').props.children).toBe(
      `Dépense estimée : ≈ ${expected.kcal} kcal (${expected.minKcal}–${expected.maxKcal})`
    );
    expect(screen.queryByText(/Calculé sur 70 kg/)).toBeNull();
  });

  it('signale le poids par defaut quand aucune pesee n’existe', () => {
    useBodyWeightStore.setState({ entries: [] });

    render(<SessionDetailScreen />);

    expect(screen.getByTestId('session-calories')).toBeTruthy();
    expect(screen.getByText(/Calculé sur 70 kg/)).toBeTruthy();
  });

  it('n’affiche rien pour une seance sans serie terminee', () => {
    useSessionStore.setState({
      sessions: [
        {
          ...SESSION,
          exercises: [
            {
              ...SESSION.exercises[0],
              sets: SESSION.exercises[0].sets.map((set) => ({ ...set, completed: false })),
            },
          ],
        },
      ],
    });
    useBodyWeightStore.setState({ entries: [] });

    render(<SessionDetailScreen />);

    expect(screen.queryByTestId('session-calories')).toBeNull();
  });
});
