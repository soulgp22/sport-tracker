import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import SessionScreen from '../index';
import { useLanguageStore } from '../../../../store/languageStore';
import { useProgramStore } from '../../../../store/programStore';
import { useActiveSessionStore } from '../../../../store/activeSessionStore';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual<any>('react');
  const { View } = jest.requireActual<any>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: any) => React.createElement(View, rest, children),
  };
});

jest.mock('@expo/vector-icons');

function resetStores() {
  useLanguageStore.setState({ language: 'fr' });
  useProgramStore.setState({ programs: [] });
  useActiveSessionStore.setState({ active: null });
}

beforeEach(() => {
  mockPush.mockClear();
  resetStores();
});

describe('SessionScreen — boutons secondaires', () => {
  const rows: [string, string][] = [
    ['Gérer les programmes', '/(tabs)/programs'],
    ['Exercices', '/(tabs)/exercises'],
  ];

  it('affiche les deux boutons même dans l’état vide', () => {
    render(<SessionScreen />);

    expect(screen.getByText('Aucun programme')).toBeTruthy();
    expect(screen.getByText('Gérer les programmes')).toBeTruthy();
    expect(screen.getByText('Exercices')).toBeTruthy();
  });

  it('chaque bouton navigue vers la bonne destination', () => {
    render(<SessionScreen />);

    for (const [label, path] of rows) {
      fireEvent.press(screen.getByText(label));
      expect(mockPush).toHaveBeenCalledWith(path);
    }

    expect(mockPush).toHaveBeenCalledTimes(rows.length);
  });

  it('n’affiche pas les deux boutons pendant une séance active', () => {
    useActiveSessionStore.setState({
      active: {
        id: 's1',
        programId: 'p1',
        programDayId: 'd1',
        programName: 'Push',
        dayName: 'Jour 1',
        startedAt: new Date().toISOString(),
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises: [],
        restTimerActive: false,
        restEndsAt: null,
        restTimerMinimized: false,
      },
    });

    render(<SessionScreen />);

    expect(screen.getByText('Séance en cours')).toBeTruthy();
    expect(screen.queryByText('Modifier ou ajouter des programmes')).toBeNull();
    expect(screen.queryByText('Exercices')).toBeNull();
  });
});

describe('SessionScreen — pluralisation du nombre d’exercices', () => {
  it('affiche « 1 exercice » (singulier) pour un jour à exactement un exercice', () => {
    useProgramStore.setState({
      programs: [
        {
          id: 'p1',
          name: 'Push',
          days: [
            {
              id: 'd1',
              name: 'Jour 1',
              order: 0,
              exercises: [
                {
                  id: 'e1',
                  exerciseId: 'c1',
                  exerciseName: 'Développé couché',
                  order: 0,
                  sets: [{ reps: 10, weight: 0, restSeconds: 90 }],
                },
              ],
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    render(<SessionScreen />);
    fireEvent.press(screen.getByText('Push'));

    expect(screen.getByText('1 exercice')).toBeTruthy();
    expect(screen.queryByText('1 exercices')).toBeNull();
  });
});

