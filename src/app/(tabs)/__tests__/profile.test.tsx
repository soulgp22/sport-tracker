import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ProfileScreen from '../profile';
import { appAlert } from '../../../components/ui/AppDialog';
import { useLanguageStore } from '../../../store/languageStore';
import { useOnboardingStore } from '../../../store/onboardingStore';
import { usePerformanceStore } from '../../../store/performanceStore';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual<any>('react');
  const { View } = jest.requireActual<any>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: any) => React.createElement(View, rest, children),
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

jest.mock('../../../components/ui/AppDialog', () => ({
  appAlert: jest.fn(),
}));

function resetStores() {
  useLanguageStore.setState({ language: 'fr' });
  usePerformanceStore.setState({
    sex: 'unspecified',
    age: undefined,
    heightCm: undefined,
    firstName: undefined,
    lastName: undefined,
  });
  useOnboardingStore.setState({ completed: true });
}

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  (appAlert as unknown as jest.Mock).mockClear();
  resetStores();
});

describe('ProfileScreen — navigation des réglages', () => {
  const rows: [string, string][] = [
    ['Objectifs et macros', '/(tabs)/nutrition/goals'],
    ['Apparence et langue', '/(tabs)/settings'],
    ['Programmes', '/(tabs)/programs'],
    ['Historique', '/(tabs)/history'],
    ['Sauvegarde et restauration', '/(tabs)/settings'],
  ];

  it('chaque rangée appelle la bonne destination', () => {
    render(<ProfileScreen />);

    for (const [label, path] of rows) {
      fireEvent.press(screen.getByText(label));
      expect(mockPush).toHaveBeenCalledWith(path);
    }

    expect(mockPush).toHaveBeenCalledTimes(rows.length);
  });

  it('affiche la version sans déclencher de navigation', () => {
    render(<ProfileScreen />);

    expect(screen.getByText('1.0.0')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('refaire l’onboarding : l’annulation ne redémarre pas et ne navigue pas', () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByText("Refaire l'onboarding"));

    // Rien ne s'exécute tant que l'utilisateur n'a pas confirmé.
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(useOnboardingStore.getState().completed).toBe(true);

    const mockAppAlert = appAlert as unknown as jest.Mock;
    expect(mockAppAlert).toHaveBeenCalledTimes(1);

    const buttons = mockAppAlert.mock.calls[0][2] as {
      text?: string;
      style?: string;
      onPress?: () => void;
    }[];
    expect(buttons).toHaveLength(2);

    const cancel = buttons.find((button) => button.style === 'cancel');
    const confirm = buttons.find((button) => button.style === 'destructive');

    // Le bouton Annuler n'a aucune action : annuler ne fait donc rien.
    expect(cancel?.onPress).toBeUndefined();
    expect(confirm?.onPress).toBeDefined();
    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('refaire l’onboarding : confirmer redémarre et remplace vers /onboarding', () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByText("Refaire l'onboarding"));

    const mockAppAlert = appAlert as unknown as jest.Mock;
    const buttons = mockAppAlert.mock.calls[0][2] as {
      style?: string;
      onPress?: () => void;
    }[];
    const confirm = buttons.find((button) => button.style === 'destructive');
    confirm?.onPress?.();

    expect(useOnboardingStore.getState().completed).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });
});
