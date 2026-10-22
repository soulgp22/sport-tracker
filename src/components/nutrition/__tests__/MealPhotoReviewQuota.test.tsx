/**
 * Refus du serveur (HTTP 402) pendant l'analyse : limite journaliere atteinte.
 *
 * Ce n'est pas une panne : aucune alerte d'erreur, le store recoit l'etat du
 * serveur et l'appelant est prevenu pour afficher l'offre. L'analyse porte
 * aussi les en-tetes du quota et l'identifiant d'analyse, redeclare ensuite a
 * l'enregistrement.
 */
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { MealPhotoReview } from '../MealPhotoReview';
import { useLanguageStore } from '../../../store/languageStore';
import { useMealPhotoQuotaStore } from '../../../store/mealPhotoQuotaStore';
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
  currentQuotaIdentity: () => ({ deviceId: 'and-0123456789abcdef', utcOffsetMinutes: 120 }),
  fetchServerQuota: jest.fn().mockResolvedValue(null),
  postConsume: jest.fn().mockResolvedValue(null),
}));

const appAlertMock = jest.requireMock('../../ui/AppDialog').appAlert as jest.Mock;
const originalFetch = global.fetch;

const QUOTA = { day: quotaDayKey(), tier: 'free', limit: 2, used: 2, remaining: 0 };

beforeEach(() => {
  useLanguageStore.setState({ language: 'fr' });
  useMealPhotoQuotaStore.setState({ date: quotaDayKey(), mealsAnalyzed: 0, server: null, pending: [] });
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///repas.jpg' }],
  });
  global.fetch = jest.fn(async (url: string) => {
    if (String(url).endsWith('/health')) return { ok: true, status: 200 };
    return {
      ok: false,
      status: 402,
      json: async () => ({ error: { code: 'quota_exceeded' }, quota: QUOTA }),
    };
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

async function analyzeFromGallery(onQuotaExceeded: jest.Mock) {
  render(
    <MealPhotoReview
      mealType="lunch"
      date={quotaDayKey()}
      onClose={jest.fn()}
      onAdded={jest.fn()}
      onQuotaExceeded={onQuotaExceeded}
    />
  );
  fireEvent.press(await screen.findByText('Importer'));
  await waitFor(() => expect(onQuotaExceeded).toHaveBeenCalledTimes(1));
}

describe('MealPhotoReview — limite atteinte cote serveur', () => {
  it('previent l’appelant sans alerte d’erreur', async () => {
    await analyzeFromGallery(jest.fn());
    expect(appAlertMock).not.toHaveBeenCalled();
  });

  it('range l’etat du serveur dans le store', async () => {
    await analyzeFromGallery(jest.fn());
    expect(useMealPhotoQuotaStore.getState().server).toMatchObject({ used: 2, limit: 2, tier: 'free' });
  });

  it('envoie les en-tetes du quota avec l’analyse', async () => {
    await analyzeFromGallery(jest.fn());
    const analysisCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url]) => !String(url).endsWith('/health')
    );
    const headers = analysisCall?.[1]?.headers as Record<string, string>;
    expect(headers['X-Device-Id']).toBe('and-0123456789abcdef');
    expect(headers['X-Utc-Offset']).toBe('120');
    expect(headers['X-Analysis-Id']).toMatch(/^a-[a-z0-9]+-[a-z0-9]+$/);
  });
});
