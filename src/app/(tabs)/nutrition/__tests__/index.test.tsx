import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import NutritionScreen from '../index';
import { useBodyWeightStore } from '../../../../store/bodyWeightStore';
import { useFoodDiaryStore } from '../../../../store/foodDiaryStore';
import { useLanguageStore } from '../../../../store/languageStore';
import { useNutritionGoalsStore } from '../../../../store/nutritionGoalsStore';
import { usePerformanceStore } from '../../../../store/performanceStore';
import { calculateDailyTotals } from '../../../../lib/nutritionCalc';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(),
  }),
  useFocusEffect: () => {},
}));

jest.mock('@expo/vector-icons', () => {
  const React = jest.requireActual<any>('react');
  const { Text } = jest.requireActual<any>('react-native');
  const Icon = ({ name, ...rest }: any) => React.createElement(Text, rest, name);
  return { Feather: Icon, Ionicons: Icon };
});

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
  mockPush.mockClear();
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

  it('chaque bouton de navigation pousse la bonne destination', () => {
    render(<NutritionScreen />);

    // La rangée subActions affiche désormais « Ajouter un repas », tout comme
    // le CTA plus bas : deux occurrences portent ce libellé. La première dans
    // l'arbre est celle de la rangée du haut.
    const addMealButtons = screen.getAllByLabelText('Ajouter un repas');
    expect(addMealButtons.length).toBeGreaterThanOrEqual(1);
    mockPush.mockClear();
    fireEvent.press(addMealButtons[0]);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/nutrition/add');

    const iconActions: [string, string][] = [
      ['Aliments', '/(tabs)/foods'],
      ['Journal du jour', '/(tabs)/nutrition/diary'],
      ['Tendance calories', '/(tabs)/nutrition/history'],
      ['Objectifs', '/(tabs)/nutrition/goals'],
    ];

    for (const [label, destination] of iconActions) {
      mockPush.mockClear();
      fireEvent.press(screen.getByLabelText(label));
      expect(mockPush).toHaveBeenCalledWith(destination);
    }
  });

  it('affiche un libellé visible sous chacune des quatre icônes de raccourci', () => {
    render(<NutritionScreen />);

    // Ces textes sont rendus dans un <Text> (visible), pas seulement dans un
    // accessibilityLabel : getByText échoue si le libellé n'est présent qu'en
    // tant qu'accessibilityLabel sur le TouchableOpacity.
    expect(screen.getByText('Aliments')).toBeTruthy();
    expect(screen.getByText('Journal du jour')).toBeTruthy();
    expect(screen.getByText('Tendance calories')).toBeTruthy();
    expect(screen.getByText('Objectifs')).toBeTruthy();
  });

  describe('ajout rapide de calories', () => {
    it('ajoute une entrée au journal du jour avec les calories saisies et des macros à 0', () => {
      render(<NutritionScreen />);

      fireEvent.press(screen.getByLabelText('Ajout rapide'));
      fireEvent.changeText(screen.getByTestId('quick-calories-input'), '450');
      fireEvent.press(screen.getByText('Ajouter'));

      const entries = useFoodDiaryStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        date: '2026-08-14',
        mealType: 'breakfast',
        foodId: 'quick-calories',
        foodName: 'Repas rapide',
        quantity: 1,
        unit: 'portion',
        calculatedNutrition: { calories: 450, protein: 0, carbs: 0, fat: 0 },
      });
    });

    it('utilise le libellé saisi quand il est renseigné', () => {
      render(<NutritionScreen />);

      fireEvent.press(screen.getByLabelText('Ajout rapide'));
      fireEvent.changeText(screen.getByTestId('quick-calories-input'), '320');
      fireEvent.changeText(screen.getByTestId('quick-calories-label'), 'Pizza maison');
      fireEvent.press(screen.getByText('Ajouter'));

      const entries = useFoodDiaryStore.getState().entries;
      expect(entries[0].foodName).toBe('Pizza maison');
    });

    it.each(['', '0', '-50', 'abc'])(
      'une saisie invalide (« %s ») n’ajoute rien au journal',
      (value) => {
        render(<NutritionScreen />);

        fireEvent.press(screen.getByLabelText('Ajout rapide'));
        fireEvent.changeText(screen.getByTestId('quick-calories-input'), value);
        fireEvent.press(screen.getByText('Ajouter'));

        expect(useFoodDiaryStore.getState().entries).toHaveLength(0);
        expect(screen.getByText('Saisis un nombre de calories entier et positif.')).toBeTruthy();
      }
    );

    it('augmente le total de calories du jour du montant saisi', () => {
      render(<NutritionScreen />);

      fireEvent.press(screen.getByLabelText('Ajout rapide'));
      fireEvent.changeText(screen.getByTestId('quick-calories-input'), '300');
      fireEvent.press(screen.getByText('Ajouter'));

      const todayEntries = useFoodDiaryStore.getState().getEntriesByDate('2026-08-14');
      expect(calculateDailyTotals(todayEntries).calories).toBe(300);
    });
  });
});
