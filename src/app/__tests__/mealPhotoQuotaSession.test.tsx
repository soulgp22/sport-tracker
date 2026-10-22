/**
 * Quota qui bascule PENDANT une session d'analyse.
 *
 * Chaque analyse reussie compte : c'est donc la derniere analyse autorisee qui
 * fait passer le quota a « atteint ». Son resultat doit rester a l'ecran (sinon
 * l'utilisateur perd ce qu'il vient d'obtenir) ; l'offre n'apparait qu'a la
 * tentative suivante, signalee par l'analyse (onQuotaExceeded).
 *
 * L'analyse est remplacee par un double : ce test porte sur la garde de
 * l'ecran, pas sur l'analyse (voir MealPhotoReviewQuotaCount.test).
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import MealPhotoScreen from '../meal-photo';
import { useMealPhotoQuotaStore } from '../../store/mealPhotoQuotaStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { quotaDayKey } from '../../lib/mealPhotoQuota';
import { INACTIVE_ENTITLEMENT } from '../../lib/billing';
import { useLanguageStore } from '../../store/languageStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, navigate: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, rest, children),
  };
});

jest.mock('../../lib/mealPhotoCapability', () => ({
  canUseMealPhoto: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock('../../lib/mealQuotaClient', () => ({
  currentQuotaIdentity: () => null,
  fetchServerQuota: jest.fn().mockResolvedValue(null),
  postConsume: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../components/nutrition/MealPhotoReview', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    MealPhotoReview: function MockMealPhotoReview(props: { onQuotaExceeded?: () => void }) {
      return ReactLocal.createElement(
        View,
        null,
        ReactLocal.createElement(Text, null, 'RESULTAT DE L’ANALYSE'),
        ReactLocal.createElement(
          Pressable,
          { onPress: props.onQuotaExceeded, testID: 'tentative-suivante' },
          ReactLocal.createElement(Text, null, 'Tentative suivante')
        )
      );
    },
  };
});

beforeEach(() => {
  useLanguageStore.setState({ language: 'fr' });
  useSubscriptionStore.setState({ entitlement: INACTIVE_ENTITLEMENT, plans: [], plansState: 'idle' });
  useMealPhotoQuotaStore.setState({ date: quotaDayKey(), mealsAnalyzed: 1, server: null, pending: [] });
});

describe('Ecran photo — quota atteint pendant la session', () => {
  it('RÉGRESSION : la dernière analyse autorisée garde son résultat à l’écran', async () => {
    render(<MealPhotoScreen />);
    await act(async () => {});
    expect(screen.getByText('RESULTAT DE L’ANALYSE')).toBeTruthy();

    // La 2e analyse gratuite reussit : le quota passe a 2/2.
    await act(async () => {
      useMealPhotoQuotaStore.getState().recordSuccessfulAnalysis('a-derniere');
    });

    expect(screen.getByText('RESULTAT DE L’ANALYSE')).toBeTruthy();
    expect(screen.queryByText('100 repas par jour')).toBeNull();
  });

  it('l’offre apparaît à la tentative suivante, signalée par l’analyse', async () => {
    render(<MealPhotoScreen />);
    await act(async () => {});
    await act(async () => {
      useMealPhotoQuotaStore.getState().recordSuccessfulAnalysis('a-derniere');
    });

    fireEvent.press(screen.getByTestId('tentative-suivante'));

    expect(screen.getByText('100 repas par jour')).toBeTruthy();
    expect(screen.queryByText('RESULTAT DE L’ANALYSE')).toBeNull();
  });
});
