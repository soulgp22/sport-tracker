/**
 * Decompte du quota photo : chaque ANALYSE REUSSIE compte (regle du
 * 2026-10-15), enregistree au journal ou non.
 *
 * Regression : le quota ne decomptait qu'a « Ajouter a ma journee ». En
 * enchainant « Reessayer » sans jamais enregistrer, on analysait a l'infini
 * (chaque analyse = un appel Gemini paye). Voir known_bugs.md.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { MealPhotoReview } from '../MealPhotoReview';
import { useLanguageStore } from '../../../store/languageStore';
import { useMealPhotoQuotaStore } from '../../../store/mealPhotoQuotaStore';
import { useSubscriptionStore } from '../../../store/subscriptionStore';
import { INACTIVE_ENTITLEMENT } from '../../../lib/billing';
import { quotaDayKey } from '../../../lib/mealPhotoQuota';

jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [null, jest.fn()],
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: () => ({
      resize: () => ({
        renderAsync: async () => ({ saveAsync: async () => ({ base64: 'QUJD' }) }),
      }),
    }),
  },
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, rest, children),
  };
});

jest.mock('../../ui/AppDialog', () => ({ appAlert: jest.fn() }));

jest.mock('../../../lib/mealQuotaClient', () => ({
  currentQuotaIdentity: () => null,
  fetchServerQuota: jest.fn().mockResolvedValue(null),
  postConsume: jest.fn().mockResolvedValue(null),
}));

const appAlertMock = jest.requireMock('../../ui/AppDialog').appAlert as jest.Mock;
const originalFetch = global.fetch;

const completion = (content: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
});
const SUCCESS = completion('{"items":[{"name":"banana","grams":120,"name_fr":"Banane"}]}');
const EMPTY = completion('{"items":[]}');
const HTTP_500 = { ok: false, status: 500, json: async () => ({}) };

const PREMIUM = {
  active: true,
  expiresAt: '2099-01-01T00:00:00Z',
  willRenew: true,
  productId: 'lst_premium:mensuel',
  managementUrl: null,
};

/** Reponses successives du serveur d'analyse ; une fois vide : SUCCESS. */
let analysisResponses: object[] = [];

function isAnalysisCall(url: unknown): boolean {
  const u = String(url);
  return !u.endsWith('/health') && !u.endsWith('/v1/food-info');
}

function analysisCalls(): number {
  return (global.fetch as jest.Mock).mock.calls.filter(([url]) => isAnalysisCall(url)).length;
}

function used(): number {
  return useMealPhotoQuotaStore.getState().mealsAnalyzed;
}

beforeEach(() => {
  analysisResponses = [];
  useLanguageStore.setState({ language: 'fr' });
  useSubscriptionStore.setState({ entitlement: INACTIVE_ENTITLEMENT, plans: [], plansState: 'idle' });
  useMealPhotoQuotaStore.setState({ date: quotaDayKey(), mealsAnalyzed: 0, server: null, pending: [] });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///repas.jpg' }],
  });
  global.fetch = jest.fn(async (url: string) => {
    if (String(url).endsWith('/health')) return { ok: true, status: 200 };
    if (String(url).endsWith('/v1/food-info')) return { ok: false, status: 404, json: async () => ({}) };
    return analysisResponses.shift() ?? SUCCESS;
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

function renderReview(props: { onQuotaExceeded?: jest.Mock; onAdded?: jest.Mock; onClose?: jest.Mock } = {}) {
  render(
    <MealPhotoReview
      mealType="lunch"
      date={quotaDayKey()}
      onClose={props.onClose ?? jest.fn()}
      onAdded={props.onAdded ?? jest.fn()}
      onQuotaExceeded={props.onQuotaExceeded}
    />
  );
}

/** Importe une photo depuis la galerie et attend l'ecran de resultat. */
async function analyzeUntilResult() {
  fireEvent.press(await screen.findByText('Importer'));
  await screen.findByText('Réessayer');
}

describe('MealPhotoReview — chaque analyse reussie compte', () => {
  it('RÉGRESSION : 2 analyses sans enregistrer, la 3e est refusée sans appel au serveur', async () => {
    const onQuotaExceeded = jest.fn();
    renderReview({ onQuotaExceeded });

    await analyzeUntilResult();
    expect(used()).toBe(1);

    fireEvent.press(screen.getByText('Réessayer'));
    await analyzeUntilResult();
    expect(used()).toBe(2);
    expect(analysisCalls()).toBe(2);

    fireEvent.press(screen.getByText('Réessayer'));
    fireEvent.press(await screen.findByText('Importer'));
    await waitFor(() => expect(onQuotaExceeded).toHaveBeenCalledTimes(1));
    expect(analysisCalls()).toBe(2);
    expect(used()).toBe(2);
  });

  it('une analyse sans aliment reconnu ne consomme rien', async () => {
    analysisResponses = [EMPTY];
    renderReview();
    fireEvent.press(await screen.findByText('Importer'));
    await waitFor(() =>
      expect(appAlertMock).toHaveBeenCalledWith('Aucun aliment reconnu', expect.any(String), expect.any(Array), expect.any(Object))
    );
    expect(used()).toBe(0);
  });

  it('une analyse en erreur serveur ne consomme rien', async () => {
    analysisResponses = [HTTP_500];
    renderReview();
    fireEvent.press(await screen.findByText('Importer'));
    await waitFor(() =>
      expect(appAlertMock).toHaveBeenCalledWith('Analyse impossible', expect.any(String), expect.any(Array), expect.any(Object))
    );
    expect(used()).toBe(0);
  });

  it('« Ajouter à ma journée » ne décompte pas une deuxième fois', async () => {
    const onAdded = jest.fn();
    renderReview({ onAdded });
    await analyzeUntilResult();
    expect(used()).toBe(1);

    fireEvent.press(await screen.findByText('Ajouter à ma journée'));
    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    expect(used()).toBe(1);
  });

  it('abonné à 100/100 : aucune analyse envoyée, alerte de limite', async () => {
    useSubscriptionStore.setState({ entitlement: PREMIUM });
    useMealPhotoQuotaStore.setState({ date: quotaDayKey(), mealsAnalyzed: 100, server: null, pending: [] });
    const onQuotaExceeded = jest.fn();
    renderReview({ onQuotaExceeded });

    fireEvent.press(await screen.findByText('Importer'));
    await waitFor(() =>
      expect(appAlertMock).toHaveBeenCalledWith('Limite quotidienne atteinte', expect.any(String), expect.any(Array), expect.any(Object))
    );
    expect(analysisCalls()).toBe(0);
    expect(onQuotaExceeded).not.toHaveBeenCalled();
  });
});
