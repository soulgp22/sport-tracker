import React from 'react';
import { render, screen } from '@testing-library/react-native';

import HomeScreen from '../index';
import { useActiveSessionStore } from '../../../store/activeSessionStore';
import { useBodyWeightStore } from '../../../store/bodyWeightStore';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useLanguageStore } from '../../../store/languageStore';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';
import { usePerformanceStore } from '../../../store/performanceStore';
import { useSessionStore } from '../../../store/sessionStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
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

const NOW = new Date('2026-08-14T12:00:00.000Z');

function resetStores() {
  useLanguageStore.setState({ language: 'fr' });
  usePerformanceStore.setState({
    sex: 'unspecified',
    age: undefined,
    heightCm: undefined,
    firstName: undefined,
    lastName: undefined,
  });
  useBodyWeightStore.setState({ entries: [] });
  useFoodDiaryStore.setState({ entries: [] });
  useNutritionGoalsStore.setState({
    goals: { dailyCalories: 2200, protein: 150, carbs: 200, fat: 65, goalType: 'maintenance' },
  });
  useSessionStore.setState({ sessions: [] });
  useActiveSessionStore.setState({ active: null });
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  resetStores();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('HomeScreen', () => {
  it('affiche le prénom de l’utilisateur quand il existe', () => {
    usePerformanceStore.setState({ firstName: 'Marc' });

    render(<HomeScreen />);

    expect(screen.getByText('Bonjour Marc')).toBeTruthy();
  });

  it('sans prénom, l’en-tête reste digne (pas de blanc parasite)', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Bonjour')).toBeTruthy();
    expect(screen.queryByText('Bonjour Marc')).toBeNull();
  });

  it("n'affiche aucune valeur de calories inventée quand la dépense est absente", () => {
    // Profil incomplet (sexe non renseigné, ni poids ni taille ni âge) :
    // resolveDailyEnergyExpenditure renvoie une dépense nulle (null).
    render(<HomeScreen />);

    // La colonne « Restantes » et la dépense affichent « — », pas un « 0 ».
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText('0 kcal dépensées')).toBeNull();
  });
});
