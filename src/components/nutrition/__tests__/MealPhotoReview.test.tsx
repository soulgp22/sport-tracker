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

describe('MealPhotoReview — régressions UI (abandon + erreur moteur)', () => {
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

  it("affiche un bouton d'abandon dans l'écran de chargement et ferme à l'appui", async () => {
    global.fetch = jest.fn().mockRejectedValue(
      new Error('fetch failed: Fetch request has been canceled')
    ) as unknown as typeof fetch;

    const onClose = jest.fn();
    render(
      <MealPhotoReview
        mealType="lunch"
        date="2026-08-16"
        onClose={onClose}
        onAdded={jest.fn()}
      />
    );

    const cancel = await screen.findByText('Annuler');
    fireEvent.press(cancel);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas le détail technique brut dans l'alerte d'erreur moteur", async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(
      new Error('fetch failed: Fetch request has been canceled')
    ) as unknown as typeof fetch;

    render(
      <MealPhotoReview
        mealType="lunch"
        date="2026-08-16"
        onClose={jest.fn()}
        onAdded={jest.fn()}
      />
    );

    await waitFor(() => expect(appAlertMock).toHaveBeenCalled());

    const message = appAlertMock.mock.calls[0][1] as string | undefined;
    expect(message).toBe("Le modèle n'a pas pu analyser la photo. Réessaie plus tard.");
    expect(message).not.toContain('fetch failed');
    expect(warnSpy).toHaveBeenCalledWith('fetch failed: Fetch request has been canceled');
  });
});
