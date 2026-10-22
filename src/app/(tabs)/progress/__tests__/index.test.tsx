import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ProgressScreen from '../index';
import { useBodyWeightStore } from '../../../../store/bodyWeightStore';
import { useLanguageStore } from '../../../../store/languageStore';
import { useNutritionGoalsStore } from '../../../../store/nutritionGoalsStore';
import { usePerformanceStore } from '../../../../store/performanceStore';
import { useSessionStore } from '../../../../store/sessionStore';

const mockParams: { tab?: string } = {};
const mockSetParams = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(),
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual<any>('react');
  const { View } = jest.requireActual<any>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: any) => React.createElement(View, rest, children),
  };
});

jest.mock('@expo/vector-icons');

// La vue Pas/Séances relit Health Connect via une promesse mockée ; on la
// neutralise pour que ces tests de vue ne dépendent ni du réseau ni du temps.
jest.mock('../../../../hooks/useEnergyHistory', () => ({
  useEnergyHistory: () => ({ daily: [], healthStatus: 'granted' }),
}));

const NOW = new Date('2026-08-14T12:00:00.000Z');

function resetStores() {
  useLanguageStore.setState({ language: 'fr' });
  usePerformanceStore.setState({
    sex: 'unspecified',
    age: undefined,
    heightCm: undefined,
    weeklySessionGoal: 3,
    monthlySessionGoal: 12,
    unlockedBadges: [],
  });
  useBodyWeightStore.setState({ entries: [] });
  useSessionStore.setState({ sessions: [] });
  useNutritionGoalsStore.setState({
    goals: { dailyCalories: 2200, protein: 150, carbs: 200, fat: 65, goalType: 'maintenance' },
  });
}

beforeEach(() => {
  mockParams.tab = undefined;
  mockSetParams.mockReset();
  jest.useFakeTimers({ now: NOW });
  resetStores();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ProgressScreen', () => {
  it("n'affiche pas le bloc « Poids actuel » sur l'onglet Exercices", () => {
    render(<ProgressScreen />);

    expect(screen.queryByText('Poids actuel')).toBeNull();
  });

  it('affiche le bloc « Poids actuel » sur l’onglet Poids corporel', () => {
    mockParams.tab = 'bodyWeight';

    render(<ProgressScreen />);

    expect(screen.getByText('Poids actuel')).toBeTruthy();
  });

  it("affiche l'en-tête « Stats » (titre) et « Progression » (kicker), sans lien Historique", () => {
    render(<ProgressScreen />);

    expect(screen.getByText('Stats')).toBeTruthy();
    expect(screen.getByText('Progression')).toBeTruthy();
    expect(screen.queryByText('Historique')).toBeNull();
  });

  it('un onglet inconnu retombe sur la vue Exercices', () => {
    mockParams.tab = 'nimporte';

    render(<ProgressScreen />);

    expect(screen.queryByText('Poids actuel')).toBeNull();
    expect(screen.queryByTestId('energy-row')).toBeNull();
    expect(screen.queryByTestId('steps-row')).toBeNull();
  });

  it("tab='sessions' affiche la vue Séances (état vide « history.emptyTitle »)", () => {
    mockParams.tab = 'sessions';

    render(<ProgressScreen />);

    // SessionHistoryList affiche son EmptyState quand aucune séance n'existe.
    expect(screen.getByText('Aucune séance')).toBeTruthy();
  });

  it("un appui sur « sessions » appelle setParams avec { tab: 'sessions' }", () => {
    render(<ProgressScreen />);

    fireEvent.press(screen.getByTestId('stats-tabs-sessions'));

    expect(mockSetParams).toHaveBeenCalledWith({ tab: 'sessions' });
  });

  it('RÉGRESSION : le changement de paramètre tab met à jour la vue d’un écran déjà monté', () => {
    // L'ancien code lisait `params.tab` uniquement au premier montage
    // (useState initializer) : un rerender avec `tab='steps'` ne changeait
    // donc plus la vue. La vue étant désormais DÉRIVÉE du paramètre, elle suit
    // immédiatement toute mise à jour.
    const { rerender } = render(<ProgressScreen />);
    expect(screen.queryByTestId('steps-row')).toBeNull();

    mockParams.tab = 'steps';
    rerender(<ProgressScreen />);
    expect(screen.getByText('Aucun pas enregistré')).toBeTruthy();
  });
});

