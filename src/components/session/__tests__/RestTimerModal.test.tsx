import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { RestTimerModal } from '../RestTimerModal';
import { useActiveSessionStore } from '../../../store/activeSessionStore';
import { useLanguageStore } from '../../../store/languageStore';
import type { Program, ProgramDay } from '../../../types';

jest.mock('@expo/vector-icons', () => {
  const React = jest.requireActual<any>('react');
  const { Text } = jest.requireActual<any>('react-native');
  const Icon = ({ name, ...rest }: any) => React.createElement(Text, rest, name);
  return { Feather: Icon, Ionicons: Icon };
});

const makeProgram = (): Program => ({
  id: 'p1', name: 'Test', days: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
});

const makeDay = (): ProgramDay => ({
  id: 'd1', name: 'Day', order: 0,
  exercises: [{
    id: 'e1', exerciseId: 'ex1', exerciseName: 'Bench', order: 0,
    sets: [{ reps: 10, weight: 60, restSeconds: 90 }],
  }],
});

const now = new Date('2026-03-01T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers({ now });
  useActiveSessionStore.setState({ active: null });
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
  useLanguageStore.setState({ language: 'fr' });
});

describe('RestTimerModal', () => {
  it('renders timer when visible and timer is set', async () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    render(<RestTimerModal visible onDismiss={jest.fn()} onMinimize={jest.fn()} />);
    expect(screen.getByText('01:30')).toBeTruthy();
    expect(screen.getByText('REPOS')).toBeTruthy();
    expect(screen.getByText('RESTANT')).toBeTruthy();
  });

  it('calls clearTimer and onDismiss when skip is pressed', async () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    const onDismiss = jest.fn();
    render(<RestTimerModal visible onDismiss={onDismiss} onMinimize={jest.fn()} />);
    fireEvent.press(screen.getByText('Passer'));
    expect(useActiveSessionStore.getState().active!.restTimerActive).toBe(false);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows the next set context and adjusts the remaining time', () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    render(
      <RestTimerModal
        visible
        onDismiss={jest.fn()}
        onMinimize={jest.fn()}
        exerciseName="Bench"
        currentSetNumber={1}
        totalSets={1}
        completedSets={0}
        targetWeight={60}
        targetReps={10}
      />
    );

    expect(screen.getByText('Bench')).toBeTruthy();
    expect(screen.getByText('Série 1 / 1')).toBeTruthy();
    expect(screen.getByText('60 kg × 10 reps')).toBeTruthy();

    fireEvent.press(screen.getByText('+15 s'));
    expect(screen.getByText('01:45')).toBeTruthy();
  });

  it('does not show French labels when the language is English', () => {
    useLanguageStore.setState({ language: 'en' });

    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    render(
      <RestTimerModal
        visible
        onDismiss={jest.fn()}
        onMinimize={jest.fn()}
        exerciseName="Bench"
        currentSetNumber={1}
        totalSets={1}
        completedSets={0}
        targetWeight={60}
        targetReps={10}
        previousWeight={55}
        previousReps={8}
      />
    );

    for (const french of ['REPOS', 'RESTANT', 'Passer', 'Serie', 'Precedente']) {
      expect(screen.queryByText(french)).toBeNull();
    }

    expect(screen.getByText('REST')).toBeTruthy();
    expect(screen.getByText('REMAINING')).toBeTruthy();
    expect(screen.getByText('Skip')).toBeTruthy();
    expect(screen.getByText('Set 1 / 1')).toBeTruthy();
    expect(screen.getByText('Previous: 55 kg × 8 reps')).toBeTruthy();
  });
});
