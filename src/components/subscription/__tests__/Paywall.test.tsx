/**
 * Ecran d'abonnement (F01-C) et choix de conversion (F01-D).
 *
 * Le fournisseur de paiement est remplace par un faux : on verifie ce que voit
 * et fait l'utilisateur, pas RevenueCat (couvert par billing.test.ts).
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { Paywall } from '../Paywall';
import { useLanguageStore } from '../../../store/languageStore';
import {
  setBillingProviderForTests,
  useSubscriptionStore,
} from '../../../store/subscriptionStore';
import { INACTIVE_ENTITLEMENT, type BillingPlan, type BillingProvider } from '../../../lib/billing';

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, rest, children),
  };
});

jest.mock('../../../lib/deviceIdentity', () => ({ getDeviceId: () => 'and-0123456789abcdef' }));
jest.mock('../../../lib/mealQuotaClient', () => ({
  currentQuotaIdentity: () => null,
  fetchServerQuota: jest.fn().mockResolvedValue(null),
  postConsume: jest.fn().mockResolvedValue(null),
}));

const PLANS: BillingPlan[] = [
  { id: '$rc_monthly', period: 'monthly', price: 9.99, priceString: '9,99 €', currencyCode: 'EUR', pricePerMonthString: '9,99 €' },
  { id: '$rc_annual', period: 'annual', price: 79.99, priceString: '79,99 €', currencyCode: 'EUR', pricePerMonthString: '6,67 €' },
];

function fakeProvider(overrides: Partial<BillingProvider> = {}): BillingProvider & { purchase: jest.Mock } {
  return {
    isAvailable: () => true,
    configure: jest.fn().mockResolvedValue(undefined),
    getPlans: jest.fn().mockResolvedValue(PLANS),
    purchase: jest.fn().mockResolvedValue({ status: 'cancelled' }),
    restore: jest.fn().mockResolvedValue(INACTIVE_ENTITLEMENT),
    getEntitlement: jest.fn().mockResolvedValue(INACTIVE_ENTITLEMENT),
    onEntitlementChange: () => () => undefined,
    ...overrides,
  } as BillingProvider & { purchase: jest.Mock };
}

beforeEach(() => {
  useLanguageStore.setState({ language: 'fr' });
  useSubscriptionStore.setState({ entitlement: INACTIVE_ENTITLEMENT, plans: [], plansState: 'idle' });
});

async function renderPaywall(provider: BillingProvider, reason: 'quota' | 'settings' = 'quota') {
  setBillingProviderForTests(provider);
  const onClose = jest.fn();
  render(<Paywall reason={reason} onClose={onClose} />);
  await act(async () => {});
  return { onClose };
}

describe('Paywall — offre', () => {
  it('explique pourquoi il s’affiche quand on arrive par la limite', async () => {
    await renderPaywall(fakeProvider(), 'quota');
    expect(screen.getByText(/Tes 2 analyses gratuites du jour sont utilisées/)).toBeTruthy();
  });

  it('ne parle pas de limite atteinte quand on vient des reglages', async () => {
    await renderPaywall(fakeProvider(), 'settings');
    expect(screen.queryByTestId('paywall-context')).toBeNull();
  });

  it('montre le gain : 2 contre 100 repas par jour', async () => {
    await renderPaywall(fakeProvider());
    expect(screen.getByText('2 repas analysés / jour')).toBeTruthy();
    expect(screen.getByText('100 repas analysés / jour')).toBeTruthy();
  });

  it('preselectionne l’annuel avec son economie calculee et son prix au mois', async () => {
    await renderPaywall(fakeProvider());
    expect(screen.getByTestId('paywall-plan-annual').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText('−33 %')).toBeTruthy();
    expect(screen.getByText('soit 6,67 € / mois')).toBeTruthy();
    expect(screen.getByText('79,99 € par an, sans engagement')).toBeTruthy();
  });

  it('le bouton repete le prix de l’offre choisie et achete celle-la', async () => {
    const provider = fakeProvider();
    await renderPaywall(provider);
    fireEvent.press(screen.getByTestId('paywall-plan-monthly'));
    expect(screen.getByText('9,99 € par mois, sans engagement')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-subscribe'));
    });
    expect(provider.purchase).toHaveBeenCalledWith('$rc_monthly');
  });

  it('une annulation ne montre aucun message', async () => {
    await renderPaywall(fakeProvider());
    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-subscribe'));
    });
    expect(screen.queryByTestId('paywall-message')).toBeNull();
  });

  it('un paiement en attente est explique', async () => {
    await renderPaywall(fakeProvider({ purchase: jest.fn().mockResolvedValue({ status: 'error', code: 'pending' }) }));
    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-subscribe'));
    });
    expect(screen.getByText(/en attente de validation par Google Play/)).toBeTruthy();
  });

  it('affiche les conditions de renouvellement et la resiliation', async () => {
    await renderPaywall(fakeProvider());
    expect(screen.getByText(/se renouvelle automatiquement au même prix/)).toBeTruthy();
    expect(screen.getByText('Résiliable à tout moment dans Google Play.')).toBeTruthy();
    expect(screen.getByText('Restaurer mes achats')).toBeTruthy();
  });

  it('annonce l’abonnement a venir si la boutique n’est pas prete', async () => {
    await renderPaywall(fakeProvider({ isAvailable: () => false }));
    expect(screen.getByTestId('paywall-unavailable')).toBeTruthy();
    expect(screen.queryByTestId('paywall-subscribe')).toBeNull();
  });
});

describe('Paywall — abonne', () => {
  const active = {
    active: true,
    expiresAt: '2099-10-22T10:00:00Z',
    willRenew: true,
    productId: 'premium:annual',
    managementUrl: null,
  };

  it('ne vend rien a un abonne : etat et gestion', async () => {
    await renderPaywall(fakeProvider({ getEntitlement: jest.fn().mockResolvedValue(active) }));
    expect(screen.getByTestId('paywall-active')).toBeTruthy();
    expect(screen.getByText('Gérer mon abonnement')).toBeTruthy();
    expect(screen.queryByTestId('paywall-subscribe')).toBeNull();
  });

  it('apres l’achat, felicite et previent le serveur sans attendre son cache', async () => {
    const { useMealPhotoQuotaStore } = jest.requireActual('../../../store/mealPhotoQuotaStore');
    const sync = jest.spyOn(useMealPhotoQuotaStore.getState(), 'syncServer');
    await renderPaywall(fakeProvider({ purchase: jest.fn().mockResolvedValue({ status: 'purchased', entitlement: active }) }));
    await act(async () => {
      fireEvent.press(screen.getByTestId('paywall-subscribe'));
    });
    expect(screen.getByText('Bienvenue dans Premium')).toBeTruthy();
    expect(sync).toHaveBeenCalledWith({ refresh: true });
  });
});
