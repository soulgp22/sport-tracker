/**
 * Régression B01 : Séance et Programmes « n'ont pas le même design ni la même
 * police que le reste de l'app ».
 *
 * Cause : ces deux écrans affichaient l'en-tête NATIF de leur pile (titre en
 * Archivo) et des boutons génériques, là où Nutrition, Progression et
 * Historique dessinent leur propre en-tête éditorial (kicker + titre Oswald).
 *
 * Ce test verrouille les deux moitiés du correctif :
 * - la pile masque son en-tête natif (sinon deux titres, dont un en Archivo) ;
 * - l'écran dessine l'en-tête partagé, en police Oswald.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { fonts } from '../../../theme/fonts';
import { useLanguageStore } from '../../../store/languageStore';
import { useProgramStore } from '../../../store/programStore';
import { useActiveSessionStore } from '../../../store/activeSessionStore';

const mockPush = jest.fn();
const capturedScreens: { name: string; options: Record<string, unknown> }[] = [];

jest.mock('expo-router', () => {
  function Stack({ children }: { children?: React.ReactNode }) {
    return children ?? null;
  }
  function StackScreen(props: { name: string; options: Record<string, unknown> }) {
    capturedScreens.push(props);
    return null;
  }
  Stack.Screen = StackScreen;
  return {
    Stack,
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, rest, children),
  };
});

jest.mock('@expo/vector-icons');
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { document: '' } }));

import SessionLayout from '../session/_layout';
import ProgramsLayout from '../programs/_layout';
import SessionScreen from '../session/index';
import ProgramsScreen from '../programs/index';

beforeEach(() => {
  mockPush.mockClear();
  capturedScreens.length = 0;
  useLanguageStore.setState({ language: 'fr' });
  useProgramStore.setState({ programs: [] });
  useActiveSessionStore.setState({ active: null });
});

function headerTitleFont() {
  const header = screen.getByTestId('screen-header');
  const title = within(header).getByRole('header');
  return StyleSheet.flatten(title.props.style).fontFamily;
}

describe.each([
  ['Séance', SessionLayout],
  ['Programmes', ProgramsLayout],
])('Pile %s', (_name, Layout) => {
  it('masque l’en-tête natif de son écran d’index', () => {
    render(<Layout />);
    const index = capturedScreens.find((s) => s.name === 'index');
    expect(index?.options.headerShown).toBe(false);
  });
});

describe('Écran Séance', () => {
  it('dessine l’en-tête éditorial en Oswald', () => {
    render(<SessionScreen />);
    const header = screen.getByTestId('screen-header');
    expect(within(header).getByText('Séance')).toBeTruthy();
    expect(within(header).getByText('Démarrer une séance')).toBeTruthy();
    expect(headerTitleFont()).toBe(fonts.serifBold);
  });

  it('garde l’en-tête pendant une séance active, sans titre en double', () => {
    useActiveSessionStore.setState({
      active: {
        id: 's1',
        programId: 'p1',
        programDayId: 'd1',
        programName: 'Push',
        dayName: 'Jour 1',
        startedAt: new Date().toISOString(),
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises: [],
        restTimerActive: false,
        restEndsAt: null,
        restTimerMinimized: false,
      },
    });
    render(<SessionScreen />);
    expect(screen.getByTestId('screen-header')).toBeTruthy();
    expect(screen.getAllByText('Séance en cours')).toHaveLength(1);
  });
});

describe('Écran Programmes', () => {
  it('dessine l’en-tête éditorial en Oswald, avec import et export à droite', () => {
    render(<ProgramsScreen />);
    const header = screen.getByTestId('screen-header');
    expect(within(header).getByText('Programmes')).toBeTruthy();
    expect(headerTitleFont()).toBe(fonts.serifBold);
    expect(within(header).getByLabelText('Importer un programme')).toBeTruthy();
    expect(within(header).getByLabelText('Exporter les programmes')).toBeTruthy();
  });

  it('les deux grandes actions gardent leur destination', () => {
    render(<ProgramsScreen />);
    fireEvent.press(screen.getByText('Télécharger un programme'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/(tabs)/community',
      params: { tab: 'programs' },
    });
    fireEvent.press(screen.getByText('Créer un programme'));
    expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/programs/new');
  });

  it('les grandes actions sont en Oswald, comme les raccourcis de l’accueil', () => {
    render(<ProgramsScreen />);
    for (const label of ['Télécharger un programme', 'Créer un programme']) {
      expect(StyleSheet.flatten(screen.getByText(label).props.style).fontFamily).toBe(fonts.serifBold);
    }
  });
});
