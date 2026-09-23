import { Platform } from 'react-native';

import { annualSavingsPercent, defaultPlanPeriod, pickPlans } from '../plans';
import {
  createRevenueCatProvider,
  toBillingErrorCode,
  toEntitlement,
  toPlan,
} from '../revenueCat';
import type { BillingPlan } from '../types';

const plan = (period: 'monthly' | 'annual', price: number, currencyCode = 'EUR'): BillingPlan => ({
  id: `$rc_${period}`,
  period,
  price,
  priceString: `${price} €`,
  currencyCode,
  pricePerMonthString: null,
});

describe('plans — economie de l’annuel', () => {
  /** 79,99 € contre 12 × 9,99 € = 119,88 € : 33,27 % -> « −33 % ». */
  it('calcule l’economie reelle, arrondie vers le bas', () => {
    expect(annualSavingsPercent(plan('monthly', 9.99), plan('annual', 79.99))).toBe(33);
  });

  it('n’annonce rien si la comparaison ment ou n’a pas de sens', () => {
    expect(annualSavingsPercent(plan('monthly', 9.99), plan('annual', 130))).toBeNull();
    expect(annualSavingsPercent(plan('monthly', 9.99), plan('annual', 79.99, 'USD'))).toBeNull();
    expect(annualSavingsPercent(null, plan('annual', 79.99))).toBeNull();
    expect(annualSavingsPercent(plan('monthly', 0), plan('annual', 79.99))).toBeNull();
  });

  it('preselectionne l’annuel quand il existe', () => {
    expect(defaultPlanPeriod(pickPlans([plan('monthly', 9.99), plan('annual', 79.99)]))).toBe('annual');
    expect(defaultPlanPeriod(pickPlans([plan('monthly', 9.99)]))).toBe('monthly');
    expect(defaultPlanPeriod(pickPlans([]))).toBeNull();
  });
});

describe('revenueCat — traduction vers le contrat neutre', () => {
  it('lit le droit « premium » actif', () => {
    const info = {
      entitlements: {
        active: {
          premium: {
            isActive: true,
            willRenew: true,
            expirationDate: '2026-10-22T10:00:00Z',
            productIdentifier: 'premium:monthly',
          },
        },
      },
      managementURL: 'https://play.google.com/store/account/subscriptions',
    } as never;
    expect(toEntitlement(info)).toEqual({
      active: true,
      expiresAt: '2026-10-22T10:00:00Z',
      willRenew: true,
      productId: 'premium:monthly',
      managementUrl: 'https://play.google.com/store/account/subscriptions',
    });
  });

  it('considere l’absence du droit comme inactive', () => {
    expect(toEntitlement({ entitlements: { active: {} }, managementURL: null } as never).active).toBe(false);
    expect(toEntitlement(null).active).toBe(false);
  });

  it('ne retient que les offres mensuelle et annuelle', () => {
    const pkg = (packageType: string) =>
      ({
        identifier: packageType,
        packageType,
        product: { priceString: '9,99 €', price: 9.99, currencyCode: 'EUR', pricePerMonthString: '9,99 €' },
      }) as never;
    expect(toPlan(pkg('MONTHLY'))?.period).toBe('monthly');
    expect(toPlan(pkg('ANNUAL'))?.period).toBe('annual');
    expect(toPlan(pkg('LIFETIME'))).toBeNull();
  });

  it('traduit les codes d’erreur utiles', () => {
    expect(toBillingErrorCode('10')).toBe('network');
    expect(toBillingErrorCode('20')).toBe('pending');
    expect(toBillingErrorCode('6')).toBe('already-owned');
    expect(toBillingErrorCode('999')).toBe('unknown');
  });
});

describe('revenueCat — fournisseur', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
  });

  function fakeModule(overrides: Record<string, unknown> = {}) {
    return {
      configure: jest.fn(),
      logIn: jest.fn(),
      getOfferings: jest.fn().mockResolvedValue({
        current: {
          availablePackages: [
            {
              identifier: '$rc_annual',
              packageType: 'ANNUAL',
              product: { priceString: '79,99 €', price: 79.99, currencyCode: 'EUR', pricePerMonthString: '6,67 €' },
            },
          ],
        },
      }),
      purchasePackage: jest.fn(),
      restorePurchases: jest.fn(),
      getCustomerInfo: jest.fn(),
      addCustomerInfoUpdateListener: jest.fn(),
      removeCustomerInfoUpdateListener: jest.fn(),
      ...overrides,
    };
  }

  it('est indisponible sans cle, meme sur Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    expect(createRevenueCatProvider('', () => null).isAvailable()).toBe(false);
    expect(createRevenueCatProvider('goog_x', () => null).isAvailable()).toBe(true);
  });

  it('configure RevenueCat avec l’identifiant d’appareil, une seule fois', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const module = fakeModule();
    const provider = createRevenueCatProvider('goog_x', () => module as never);
    await provider.configure('and-0123456789abcdef');
    await provider.configure('and-0123456789abcdef');
    expect(module.configure).toHaveBeenCalledTimes(1);
    expect(module.configure).toHaveBeenCalledWith({ apiKey: 'goog_x', appUserID: 'and-0123456789abcdef' });
  });

  it('distingue l’annulation d’une erreur', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const module = fakeModule({
      purchasePackage: jest.fn().mockRejectedValue({ code: '1', userCancelled: true }),
    });
    const provider = createRevenueCatProvider('goog_x', () => module as never);
    await provider.configure('and-0123456789abcdef');
    const [annual] = await provider.getPlans();
    expect(await provider.purchase(annual.id)).toEqual({ status: 'cancelled' });

    module.purchasePackage.mockRejectedValue({ code: '10' });
    expect(await provider.purchase(annual.id)).toEqual({ status: 'error', code: 'network' });
  });

  /**
   * Paiement accepte par Google mais produit non rattache au droit dans
   * RevenueCat : ne pas afficher « Bienvenue dans Premium » a quelqu'un qui
   * n'aura pas ses 100 repas.
   */
  it('refuse de declarer un succes sans droit actif', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    const module = fakeModule({
      purchasePackage: jest.fn().mockResolvedValue({ customerInfo: { entitlements: { active: {} } } }),
    });
    const provider = createRevenueCatProvider('goog_x', () => module as never);
    await provider.configure('and-0123456789abcdef');
    const [annual] = await provider.getPlans();
    expect(await provider.purchase(annual.id)).toEqual({ status: 'error', code: 'store' });
  });
});
