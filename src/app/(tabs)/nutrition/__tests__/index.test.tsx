import React from 'react';
import { render, screen } from '@testing-library/react-native';

import NutritionScreen from '../index';
import { useBodyWeightStore } from '../../../../store/bodyWeightStore';
import { useFoodDiaryStore } from '../../../../store/foodDiaryStore';
import { useLanguageStore } from '../../../../store/languageStore';
import { useNutritionGoalsStore } from '../../../../store/nutritionGoalsStore';
import { usePerformanceStore } from '../../../../store/performanceStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(),
  }),
  useFocusEffect: () => {},
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
    activityLevel: 'sedentary',
  });
  useBodyWeightStore.setState({ entries: [] });
  useFoodDiaryStore.setState({ entries: [] });
  useNutritionGoalsStore.setState({
    goals: { dailyCalories: 2200, protein: 150, carbs: 200, fat: 65, goalType: 'maintenance' },
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  resetStores();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('NutritionScreen', () => {
  it('affiche les repas réellement présents dans le journal du jour', () => {
    useFoodDiaryStore.setState({
      entries: [
        {
          id: 'entry-1',
          date: '2026-08-14T08:00:00.000Z',
          mealType: 'breakfast',
          foodId: 'food-eggs',
          foodName: 'Oeufs',
          quantity: 100,
          unit: 'g',
          calculatedNutrition: { calories: 200, protein: 13, carbs: 1, fat: 15 },
        },
        {
          id: 'entry-2',
          date: '2026-08-14T12:30:00.000Z',
          mealType: 'lunch',
          foodId: 'food-chicken',
          foodName: 'Poulet',
          quantity: 150,
          unit: 'g',
          calculatedNutrition: { calories: 350, protein: 45, carbs: 0, fat: 18 },
        },
      ],
    });

    render(<NutritionScreen />);

    expect(screen.getByText('Petit-déjeuner')).toBeTruthy();
    expect(screen.getByText('Déjeuner')).toBeTruthy();
    expect(screen.getByText('200')).toBeTruthy();
    expect(screen.getByText('350')).toBeTruthy();
  });

  it('affiche un état vide explicite quand aucun repas n’est enregistré', () => {
    render(<NutritionScreen />);

    expect(screen.getByText('Aucun repas aujourd\'hui')).toBeTruthy();
    expect(screen.queryByText('Petit-déjeuner')).toBeNull();
    expect(screen.queryByText('Déjeuner')).toBeNull();
  });
});
