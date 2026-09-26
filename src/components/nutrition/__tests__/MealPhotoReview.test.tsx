import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { MealPhotoReview } from '../MealPhotoReview';
import { useLanguageStore } from '../../../store/languageStore';

// Les jest.fn() sont créés DANS la factory de jest.mock pour échapper au
// hoisting de babel-plugin-jest-hoist, puis récupérés via jest.requireMock.
jest.mock('expo-camera', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const takePictureAsync = jest.fn();
  const useCameraPermissions = jest.fn();
  const CameraView = React.forwardRef(
    (props: { testID?: string }, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({ takePictureAsync }));
      return React.createElement(View, { testID: props.testID });
    }
  );
  CameraView.displayName = 'CameraView';
  return { CameraView, useCameraPermissions, takePictureAsync };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  requestCameraPermissionsAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      React.createElement(View, rest, children),
  };
});

jest.mock('../../ui/AppDialog', () => ({
  appAlert: jest.fn(),
}));

const expoCameraMock = jest.requireMock('expo-camera') as {
  takePictureAsync: jest.Mock;
  useCameraPermissions: jest.Mock;
};

const appAlertMock = jest.requireMock('../../ui/AppDialog').appAlert as jest.Mock;

const grantedPermission = {
  granted: true,
  status: 'granted',
  canAskAgain: true,
  expires: 'never',
};

function grantCameraPermission() {
  expoCameraMock.useCameraPermissions.mockReturnValue([grantedPermission, jest.fn()]);
}

const originalFetch = global.fetch;

describe('MealPhotoReview — capture intégrée (CameraView)', () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: 'fr' });
    expoCameraMock.useCameraPermissions.mockReturnValue([null, jest.fn()]);
    expoCameraMock.takePictureAsync.mockResolvedValue({ uri: undefined });
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('rend une CameraView dans le viseur quand la permission est accordée', async () => {
    grantCameraPermission();

    render(
      <MealPhotoReview
        mealType="lunch"
        date="2026-08-16"
        onClose={jest.fn()}
        onAdded={jest.fn()}
      />
    );

    await waitFor(() => expect(screen.getByTestId('meal-camera')).toBeTruthy());
  });

  it("photographie via takePictureAsync et n'ouvre pas la caméra système", async () => {
    grantCameraPermission();

    render(
      <MealPhotoReview
        mealType="lunch"
        date="2026-08-16"
        onClose={jest.fn()}
        onAdded={jest.fn()}
      />
    );

    const button = await waitFor(() => screen.getByText('Photographier'));

    fireEvent.press(button);

    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(expoCameraMock.takePictureAsync).toHaveBeenCalledWith({ quality: 0.7 });
  });
});

describe('MealPhotoReview — régressions UI (caméra immédiate + erreur serveur)', () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: 'fr' });
    expoCameraMock.useCameraPermissions.mockReturnValue([null, jest.fn()]);
    appAlertMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  function renderReview(onClose = jest.fn()) {
    return render(
      <MealPhotoReview
        mealType="lunch"
        date="2026-08-16"
        onClose={onClose}
        onAdded={jest.fn()}
      />
    );
  }

  it("affiche l'écran de capture immédiatement quand la sonde /health est encore en attente (régression 1)", async () => {
    // Sonde qui ne se résout jamais : isReady reste faux. L'écran ne doit PAS
    // rester bloqué en 'loading' — la caméra s'ouvre tout de suite.
    jest.useFakeTimers();
    global.fetch = jest.fn().mockImplementation(
      () => new Promise(() => {})
    ) as unknown as typeof fetch;

    renderReview();

    // Le bouton de capture est présent dès le premier render, sans attendre la
    // sonde. getByText est synchrone : pas de waitFor qui avancerait les timers.
    expect(screen.getByText('Photographier')).toBeTruthy();
    // Le texte trompeur « Chargement du modèle IA… » a disparu.
    expect(screen.queryByText('Chargement du modèle IA…')).toBeNull();

    // Libère le timer de la sonde (5 s) pour ne laisser aucun handle ouvert.
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("affiche un bouton d'abandon dans l'écran de capture et ferme à l'appui", async () => {
    global.fetch = jest.fn().mockRejectedValue(
      new Error('fetch failed: Fetch request has been canceled')
    ) as unknown as typeof fetch;

    const onClose = jest.fn();
    renderReview(onClose);

    const cancel = await screen.findByText('Annuler');
    fireEvent.press(cancel);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("alerte « Analyse indisponible » quand la sonde /health échoue, pas le message d'échec d'analyse (régression 2)", async () => {
    global.fetch = jest.fn().mockRejectedValue(
      new Error('fetch failed: Fetch request has been canceled')
    ) as unknown as typeof fetch;

    renderReview();

    await waitFor(() => expect(appAlertMock).toHaveBeenCalled());

    const [title, message] = appAlertMock.mock.calls[0] as [string, string];
    expect(title).toBe('Analyse indisponible');
    expect(message).toBe(
      "Le serveur d'analyse ne répond pas pour le moment. Réessaie dans quelques minutes."
    );
    expect(message).not.toContain("Le modèle n'a pas pu analyser la photo.");
  });

  it('alerte « Analyse indisponible » quand la sonde /health renvoie un HTTP non-ok (503)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as unknown as typeof fetch;

    renderReview();

    await waitFor(() => expect(appAlertMock).toHaveBeenCalled());

    const [title, message] = appAlertMock.mock.calls[0] as [string, string];
    expect(title).toBe('Analyse indisponible');
    expect(message).toBe(
      "Le serveur d'analyse ne répond pas pour le moment. Réessaie dans quelques minutes."
    );
  });

  it("n'affiche pas le détail technique brut dans l'alerte serveur", async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(
      new Error('fetch failed: Fetch request has been canceled')
    ) as unknown as typeof fetch;

    renderReview();

    await waitFor(() => expect(appAlertMock).toHaveBeenCalled());

    const message = appAlertMock.mock.calls[0][1] as string;
    expect(message).toBe(
      "Le serveur d'analyse ne répond pas pour le moment. Réessaie dans quelques minutes."
    );
    expect(message).not.toContain('fetch failed');
    expect(warnSpy).toHaveBeenCalledWith('fetch failed: Fetch request has been canceled');
  });
});
