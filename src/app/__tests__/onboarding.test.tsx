import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import OnboardingScreen from '../onboarding';
import { useOnboardingStore } from '../../store/onboardingStore';
import { usePerformanceStore } from '../../store/performanceStore';
import { useLanguageStore } from '../../store/languageStore';
import { useBodyWeightStore } from '../../store/bodyWeightStore';

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
  useOnboardingStore.setState({ completed: false });
}

beforeEach(() => {
  resetStores();
});

describe('OnboardingScreen — prénom', () => {
  it('saisit le prénom à l’étape 2 et l’enregistre via setFirstName', () => {
    render(<OnboardingScreen />);

    // Étape 1 (langue) → étape 2 (profil)
    fireEvent.press(screen.getByText('Continuer'));

    const input = screen.getByPlaceholderText('Marc');
    fireEvent.changeText(input, 'Marc');

    fireEvent.press(screen.getByText('Continuer'));

    expect(usePerformanceStore.getState().firstName).toBe('Marc');
  });

  it('sans prénom saisi, firstName reste undefined (pas une chaîne vide)', () => {
    render(<OnboardingScreen />);

    fireEvent.press(screen.getByText('Continuer'));
    fireEvent.press(screen.getByText('Continuer'));

    expect(usePerformanceStore.getState().firstName).toBeUndefined();
  });
});
