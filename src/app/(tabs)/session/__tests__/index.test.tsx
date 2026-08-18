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
    ['Modifier ou ajouter des programmes', '/(tabs)/programs'],
    ['Exercices', '/(tabs)/exercises'],
  ];

  it('affiche les deux boutons même dans l’état vide', () => {
    render(<SessionScreen />);

    expect(screen.getByText('Aucun programme')).toBeTruthy();
    expect(screen.getByText('Modifier ou ajouter des programmes')).toBeTruthy();
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
