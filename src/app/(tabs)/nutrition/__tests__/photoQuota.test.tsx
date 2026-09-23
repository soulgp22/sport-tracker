/**
 * Garde du quota sur l'ecran d'analyse photo.
 *
 * L'accueil et l'ecran Nutrition poussent vers cette route ; « Ajouter un
 * repas » a son propre bouton, garde par le meme hook (addPhotoQuota.test).
 * Le vrai verrou reste le serveur, qui refuse l'analyse (HTTP 402).
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

import MealPhotoScreen from '../photo';
import { useMealPhotoQuotaStore } from '../../../../store/mealPhotoQuotaStore';
import { useSubscriptionStore } from '../../../../store/subscriptionStore';
import { canUseMealPhoto } from '../../../../lib/mealPhotoCapability';
import { quotaDayKey } from '../../../../lib/mealPhotoQuota';
import { INACTIVE_ENTITLEMENT } from '../../../../lib/billing';
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

jest.mock('../../../../lib/mealQuotaClient', () => ({
  currentQuotaIdentity: () => null,
  fetchServerQuota: jest.fn().mockResolvedValue(null),
  postConsume: jest.fn().mockResolvedValue(null),
}));

const PREMIUM = {
  active: true,
  expiresAt: '2099-01-01T00:00:00Z',
  willRenew: true,
  productId: 'premium:monthly',
  managementUrl: null,
};

function setQuota(mealsAnalyzed: number, server: { tier: 'free' | 'premium'; used: number } | null = null) {
  useMealPhotoQuotaStore.setState({
    date: quotaDayKey(),
    mealsAnalyzed,
    pending: [],
    server: server ? { day: quotaDayKey(), limit: server.tier === 'premium' ? 100 : 2, ...server } : null,
  });
}

beforeEach(() => {
  useLanguageStore.setState({ language: 'fr' });
  useSubscriptionStore.setState({ entitlement: INACTIVE_ENTITLEMENT, plans: [], plansState: 'idle' });
  (canUseMealPhoto as jest.Mock).mockClear().mockResolvedValue({ ok: true });
});

async function open() {
  render(<MealPhotoScreen />);
  await act(async () => {});
}

describe('Ecran photo — garde du quota journalier', () => {
  it('laisse passer tant que la limite n’est pas atteinte', async () => {
    setQuota(1);
    await open();
    expect(screen.queryByText('100 repas par jour')).toBeNull();
    expect(canUseMealPhoto).toHaveBeenCalled();
  });

  it('au 2e repas gratuit, affiche l’offre d’abonnement avec son contexte', async () => {
    setQuota(2);
    await open();
    expect(screen.getByText('100 repas par jour')).toBeTruthy();
    expect(screen.getByText(/Tes 2 analyses gratuites du jour sont utilisées/)).toBeTruthy();
  });

  /**
   * Le module d'analyse ne doit meme pas etre sollicite quand le quota est
   * atteint : sinon l'utilisateur verrait la camera s'ouvrir avant d'etre
   * bloque, et on paierait une verification de capacite pour rien.
   */
  it('ne sollicite pas le module d’analyse quand le quota est atteint', async () => {
    setQuota(2);
    await open();
    expect(canUseMealPhoto).not.toHaveBeenCalled();
  });

  /** Reinstallation : le telephone a oublie, le serveur non. */
  it('bloque sur la foi du serveur meme si le compteur local est a zero', async () => {
    setQuota(0, { tier: 'free', used: 2 });
    await open();
    expect(screen.getByText('100 repas par jour')).toBeTruthy();
  });

  it('rouvre l’acces le lendemain', async () => {
    useMealPhotoQuotaStore.setState({ date: '2020-01-01', mealsAnalyzed: 2, server: null, pending: [] });
    await open();
    expect(screen.queryByText('100 repas par jour')).toBeNull();
  });
});

describe('Ecran photo — abonne', () => {
  it('laisse passer un abonne au-dela de 2 repas', async () => {
    useSubscriptionStore.setState({ entitlement: PREMIUM });
    setQuota(2, { tier: 'premium', used: 2 });
    await open();
    expect(screen.queryByText('100 repas par jour')).toBeNull();
    expect(canUseMealPhoto).toHaveBeenCalled();
  });

  it('a 100 repas, annonce la limite sans rien vendre', async () => {
    useSubscriptionStore.setState({ entitlement: PREMIUM });
    setQuota(100, { tier: 'premium', used: 100 });
    await open();
    expect(screen.getByText('Limite quotidienne atteinte')).toBeTruthy();
    expect(screen.getByText(/100 repas aujourd'hui/)).toBeTruthy();
    expect(screen.queryByTestId('paywall-subscribe')).toBeNull();
  });
});
