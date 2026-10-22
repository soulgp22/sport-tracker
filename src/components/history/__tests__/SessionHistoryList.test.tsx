/**
 * Extrait de `SessionHistoryList` (liste des seances de l'ecran Historique).
 * Verifie que l'extraction pure ne change pas le rendu : regroupement par jour,
 * titre du programme (ou « Séance libre »), et navigation vers le detail.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SessionHistoryList } from '../SessionHistoryList';
import { useSessionStore } from '../../../store/sessionStore';
import { useLanguageStore } from '../../../store/languageStore';
import type { Session } from '../../../types';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, rest, children),
  };
});

function session(partial: Partial<Session> & { id: string; date: string }): Session {
  return {
    durationSeconds: 3600,
    exercises: [],
    ...partial,
  } as Session;
}

function setSessions(sessions: Session[]) {
  useSessionStore.setState({ sessions });
}

beforeEach(() => {
  mockPush.mockClear();
  useLanguageStore.setState({ language: 'fr' });
  useSessionStore.setState({ sessions: [] });
});

describe('SessionHistoryList', () => {
  it('regroupe les seances par jour avec deux en-tetes', () => {
    const sameDay = new Date(2026, 8, 20, 8, 0).toISOString();
    const otherDay = new Date(2026, 8, 19, 8, 0).toISOString();

    setSessions([
      session({ id: 'a', date: sameDay, programName: 'Push' }),
      session({ id: 'b', date: sameDay, programName: 'Pull' }),
      session({ id: 'c', date: otherDay, programName: 'Legs' }),
    ]);

    render(<SessionHistoryList />);

    // Deux jours distincts -> deux en-tetes de section (jour).
    const headers = screen.getAllByText(/sept\./i);
    expect(headers.length).toBe(2);
  });

  it('affiche le titre du programme et « Séance libre » sans programName', () => {
    const day = new Date(2026, 8, 20, 8, 0).toISOString();

    setSessions([
      session({ id: 'a', date: day, programName: 'Push' }),
      session({ id: 'b', date: day }),
    ]);

    render(<SessionHistoryList />);

    expect(screen.getByText('Push')).toBeTruthy();
    expect(screen.getByText('Séance libre')).toBeTruthy();
  });

  it('navigue vers le detail quand on appuie sur une ligne', () => {
    const day = new Date(2026, 8, 20, 8, 0).toISOString();

    setSessions([session({ id: 'sess-123', date: day, programName: 'Push' })]);

    render(<SessionHistoryList />);

    fireEvent.press(screen.getByText('Push'));

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/history/sess-123');
  });

  it('affiche l’EmptyState quand il n’y a aucune seance', () => {
    setSessions([]);

    render(<SessionHistoryList />);

    expect(screen.getByText('Aucune séance')).toBeTruthy();
    expect(screen.getByText('Démarrez votre première séance')).toBeTruthy();
  });
});
