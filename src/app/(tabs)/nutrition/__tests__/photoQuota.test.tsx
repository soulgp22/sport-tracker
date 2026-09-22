/**
 * Garde du quota sur l'ecran d'analyse photo.
 *
 * `/(tabs)/nutrition/photo` est le SEUL point d'entree vers l'analyse :
 * l'accueil et l'ecran Nutrition poussent tous deux vers cette route. Tester ce
 * garde couvre donc les deux boutons.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

import MealPhotoScreen from '../photo';
import { useMealPhotoQuotaStore } from '../../../../store/mealPhotoQuotaStore';
import { canUseMealPhoto } from '../../../../lib/mealPhotoCapability';
import { quotaDayKey } from '../../../../lib/mealPhotoQuota';
import { useLanguageStore } from '../../../../store/languageStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, rest, children),
  };
});

jest.mock('../../../../lib/mealPhotoCapability', () => ({
  canUseMealPhoto: jest.fn().mockResolvedValue({ ok: true }),
}));

beforeEach(() => {
  useLanguageStore.setState({ language: 'fr' });
  (canUseMealPhoto as jest.Mock).mockClear().mockResolvedValue({ ok: true });
});

describe('Ecran photo — garde du quota journalier', () => {
  it('laisse passer tant que la limite n’est pas atteinte', async () => {
    useMealPhotoQuotaStore.setState({ date: quotaDayKey(), mealsAnalyzed: 1 });

    render(<MealPhotoScreen />);
    await act(async () => {});

    expect(screen.queryByText('Limite quotidienne atteinte')).toBeNull();
    expect(canUseMealPhoto).toHaveBeenCalled();
  });

  it('bloque au 2e repas et annonce le compte payant', async () => {
    useMealPhotoQuotaStore.setState({ date: quotaDayKey(), mealsAnalyzed: 2 });

    render(<MealPhotoScreen />);
    await act(async () => {});

    expect(screen.getByText('Limite quotidienne atteinte')).toBeTruthy();
    expect(screen.getByText(/compte payant/i)).toBeTruthy();
  });

  /**
   * Le module d'analyse ne doit meme pas etre sollicite quand le quota est
   * atteint : sinon l'utilisateur verrait la camera s'ouvrir avant d'etre
   * bloque, et on paierait une verification de capacite pour rien.
   */
  it('ne sollicite pas le module d’analyse quand le quota est atteint', async () => {
    useMealPhotoQuotaStore.setState({ date: quotaDayKey(), mealsAnalyzed: 2 });

    render(<MealPhotoScreen />);
    await act(async () => {});

    expect(canUseMealPhoto).not.toHaveBeenCalled();
  });

  it('rouvre l’acces le lendemain', async () => {
    useMealPhotoQuotaStore.setState({ date: '2020-01-01', mealsAnalyzed: 2 });

    render(<MealPhotoScreen />);
    await act(async () => {});

    expect(screen.queryByText('Limite quotidienne atteinte')).toBeNull();
  });
});
