/**
 * Régression : « le retour arrière revient à l'accueil au lieu du menu précédent ».
 *
 * Les sections Programmes, Exercices, Aliments, Historique, Communauté et
 * Réglages sont des ONGLETS masqués (`href: null`), pas des écrans empilés.
 * Passer de l'un à l'autre est donc un changement d'onglet, et le
 * `backBehavior` par défaut de React Navigation (`firstRoute`) renvoie
 * systématiquement sur le premier onglet — l'accueil.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import { TabRouter } from 'expo-router/build/react-navigation/routers/TabRouter';

let capturedProps: Record<string, unknown> = {};

jest.mock('expo-router', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const Tabs = (props: Record<string, unknown>) => {
    capturedProps = props;
    return ReactLocal.createElement(ReactLocal.Fragment, null);
  };
  Tabs.Screen = () => null;
  return { Tabs };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import TabLayout from '../_layout';

/** Ordre réel des onglets déclarés dans `src/app/(tabs)/_layout.tsx`. */
const ROUTE_NAMES = [
  'index',
  'session',
  'nutrition',
  'progress',
  'profile',
  'programs',
  'exercises',
  'foods',
  'history',
  'community',
  'settings',
];

type TabState = { index: number; routes: { name: string }[] };

/** Rejoue un parcours d'onglets puis un retour arrière, et renvoie la destination. */
function destinationAfterBack(backBehavior: string | undefined, path: string[]): string {
  const router = TabRouter({ backBehavior } as never) as unknown as {
    getInitialState: (o: unknown) => TabState;
    getStateForAction: (s: TabState, a: unknown, o: unknown) => TabState | null;
  };
  const options = { routeNames: ROUTE_NAMES, routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options);
  for (const name of path) {
    state = router.getStateForAction(state, { type: 'NAVIGATE', payload: { name } }, options) ?? state;
  }
  const back = router.getStateForAction(state, { type: 'GO_BACK' }, options);
  return back ? back.routes[back.index].name : '<sortie de l’application>';
}

describe('Navigation par onglets — le retour revient au menu précédent', () => {
  it('déclare backBehavior="history" sur le navigateur d’onglets', () => {
    render(<TabLayout />);
    expect(capturedProps.backBehavior).toBe('history');
  });

  const parcours: [string, string[], string][] = [
    ['Nutrition → Aliments', ['nutrition', 'foods'], 'nutrition'],
    ['Programmes → Communauté', ['programs', 'community'], 'programs'],
    ['Progression → Historique', ['progress', 'history'], 'progress'],
    ['Séance → Exercices', ['session', 'exercises'], 'session'],
    ['Profil → Réglages', ['profile', 'settings'], 'profile'],
  ];

  it.each(parcours)('%s : le retour revient au menu précédent', (_label, path, expected) => {
    expect(destinationAfterBack('history', path)).toBe(expected);
    // Le défaut de la bibliothèque est bien ce qui produisait le bug.
    expect(destinationAfterBack(undefined, path)).toBe('index');
  });

  it('revient à l’accueil quand l’accueil EST le menu précédent', () => {
    expect(destinationAfterBack('history', ['nutrition'])).toBe('index');
    expect(destinationAfterBack('history', ['session'])).toBe('index');
  });

  it('ne piège pas l’utilisateur sur l’accueil initial', () => {
    expect(destinationAfterBack('history', [])).toBe('<sortie de l’application>');
  });
});
