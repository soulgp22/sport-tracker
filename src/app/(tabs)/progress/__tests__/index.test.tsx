import React from 'react';
import { render, screen } from '@testing-library/react-native';

import ProgressScreen from '../index';
import { useBodyWeightStore } from '../../../../store/bodyWeightStore';
import { useLanguageStore } from '../../../../store/languageStore';
import { useNutritionGoalsStore } from '../../../../store/nutritionGoalsStore';
import { usePerformanceStore } from '../../../../store/performanceStore';
import { useSessionStore } from '../../../../store/sessionStore';

const mockParams: { tab?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(),
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
});
