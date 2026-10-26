import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EnergyHistoryList } from '../EnergyHistoryList';
import { useLanguageStore } from '../../../store/languageStore';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() }),
}));

beforeEach(() => {
  useLanguageStore.setState({ language: 'fr' });
  mockPush.mockClear();
});

describe('EnergyHistoryList — Stats > Pas sans permission', () => {
  it('propose la connexion Health Connect sur place et la lance', () => {
    const onConnect = jest.fn();

    render(<EnergyHistoryList metric="steps" daily={[]} healthStatus="needsPermission" onConnect={onConnect} />);

    expect(screen.getByText('Aucun pas enregistré')).toBeTruthy();
    fireEvent.press(screen.getByText('Connecter Health Connect'));
    expect(onConnect).toHaveBeenCalledTimes(1);
    // Plus aucun detour par l'ecran Nutrition.
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('pendant la connexion, le bouton ne relance rien', () => {
    const onConnect = jest.fn();

    render(
      <EnergyHistoryList metric="steps" daily={[]} healthStatus="needsPermission" onConnect={onConnect} connecting />
    );

    // Sans action, EmptyState ne rend pas de bouton.
    expect(screen.queryByText('Connecter Health Connect')).toBeNull();
  });

  it('permission accordee mais aucun pas : pas de bouton de connexion', () => {
    render(<EnergyHistoryList metric="steps" daily={[]} healthStatus="granted" onConnect={jest.fn()} />);

    expect(screen.getByText('Aucun pas enregistré')).toBeTruthy();
    expect(screen.queryByText('Connecter Health Connect')).toBeNull();
  });
});
