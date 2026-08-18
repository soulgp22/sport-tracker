import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

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

    // Le grand nombre « Restantes » et le poids (sans pesée)
    // affichent « — », pas un « 0 ».
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText('0 kcal dépensées')).toBeNull();
  });

  it("invite à compléter le profil quand la dépense estimée est indisponible", () => {
    render(<HomeScreen />);

    // Le sous-titre de la colonne « Restantes » remplace le tiret muet
    // par une invitation courte à compléter le profil.
    expect(screen.getByText('Complète ton profil')).toBeTruthy();

    // Le tiret seul ne figure plus à cet emplacement : il ne reste que le
    // grand nombre « Restantes » et le poids.
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('affiche « — » pour le poids quand aucune pesée n’est enregistrée', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Poids actuel')).toBeTruthy();
    expect(screen.getByTestId('home-weight-value').props.children).toBe('—');
  });

  it('affiche la dernière pesée sur l’accueil', () => {
    useBodyWeightStore.setState({
      entries: [{ id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 81.7 }],
    });

    render(<HomeScreen />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('81.7 kg')).toBeTruthy();
  });

  it('au premier rendu, les calories affichées sont inférieures à la valeur finale (le compteur monte)', () => {
    useFoodDiaryStore.setState({
      entries: [
        {
          id: 'f-1',
          date: '2026-08-14T08:00:00.000Z',
          mealType: 'breakfast',
          foodId: 'food-1',
          foodName: 'Test',
          quantity: 100,
          unit: 'g',
          calculatedNutrition: { calories: 500, protein: 0, carbs: 0, fat: 0 },
        },
      ],
    });

    render(<HomeScreen />);

    const calories = screen.getByTestId('home-calories-value');
    expect(Number(calories.props.children)).toBeLessThan(500);
  });

  it("pendant la montée, le poids ne montre jamais plus d'une décimale", () => {
    useBodyWeightStore.setState({
      entries: [{ id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 81.7 }],
    });

    render(<HomeScreen />);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const weight = screen.getByTestId('home-weight-value');
    const children = weight.props.children;
    const numericText = Array.isArray(children) ? String(children[0]) : String(children);

    expect(numericText).toMatch(/^-?\d+(\.\d)?$/);
  });
});
