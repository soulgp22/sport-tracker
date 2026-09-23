/**
 * Regression F01-A : le bouton photo de « Ajouter un repas » ouvrait l'analyse
 * SANS passer par le garde du quota. La limite gratuite de 2 repas se
 * contournait donc depuis cet ecran.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import AddMealScreen from '../add';
import { useMealPhotoQuotaStore } from '../../../../store/mealPhotoQuotaStore';
import { useSubscriptionStore } from '../../../../store/subscriptionStore';
import { quotaDayKey } from '../../../../lib/mealPhotoQuota';
import { INACTIVE_ENTITLEMENT } from '../../../../lib/billing';
import { useLanguageStore } from '../../../../store/languageStore';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, rest, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('../../../../lib/mealPhotoCapability', () => ({
  canUseMealPhoto: jest.fn().mockResolvedValue({ ok: true }),
}));

// Le composant d'analyse lui-meme n'est pas l'objet du test : un marqueur suffit.
jest.mock('../../../../components/nutrition/MealPhotoReview', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const ReactLocal = jest.requireActual<typeof React>('react');
  return { MealPhotoReview: () => ReactLocal.createElement(Text, null, 'ANALYSE OUVERTE') };
});

jest.mock('../../../../components/nutrition/BarcodeScannerModal', () => ({
  BarcodeScannerModal: () => null,
}));

jest.mock('../../../../lib/mealQuotaClient', () => ({
  currentQuotaIdentity: () => null,
  fetchServerQuota: jest.fn().mockResolvedValue(null),
  postConsume: jest.fn().mockResolvedValue(null),
}));

beforeEach(() => {
  mockPush.mockClear();
  useLanguageStore.setState({ language: 'fr' });
  useSubscriptionStore.setState({ entitlement: INACTIVE_ENTITLEMENT });
});

async function pressPhoto() {
  render(<AddMealScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByLabelText('Analyser une photo de repas'));
}

describe('Ajouter un repas — bouton photo et quota', () => {
  it('ouvre l’analyse sous la limite', async () => {
    useMealPhotoQuotaStore.setState({ date: quotaDayKey(), mealsAnalyzed: 1, server: null, pending: [] });
    await pressPhoto();
    expect(screen.getByText('ANALYSE OUVERTE')).toBeTruthy();
  });

  it('au-dela de la limite gratuite, envoie vers l’offre au lieu d’ouvrir l’analyse', async () => {
    useMealPhotoQuotaStore.setState({ date: quotaDayKey(), mealsAnalyzed: 2, server: null, pending: [] });
    await pressPhoto();
    expect(screen.queryByText('ANALYSE OUVERTE')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(tabs)/nutrition/premium',
      params: { reason: 'quota' },
    });
  });
});
