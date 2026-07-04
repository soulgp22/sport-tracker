import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { RestTimerModal } from '../RestTimerModal';
import { useActiveSessionStore } from '../../../store/activeSessionStore';
import type { Program, ProgramDay } from '../../../types';

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
});

describe('RestTimerModal', () => {
  it('renders timer when visible and timer is set', async () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    render(<RestTimerModal visible onDismiss={jest.fn()} />);
    expect(screen.getByText('01:30')).toBeTruthy();
    expect(screen.getByText('Repos')).toBeTruthy();
  });

  it('calls clearTimer and onDismiss when skip is pressed', async () => {
    useActiveSessionStore.getState().startSession(makeProgram(), makeDay());
    useActiveSessionStore.getState().setRestTimer(90);
    const onDismiss = jest.fn();
    render(<RestTimerModal visible onDismiss={onDismiss} />);
    fireEvent.press(screen.getByText('Passer'));
    expect(useActiveSessionStore.getState().active!.restTimerActive).toBe(false);
    expect(onDismiss).toHaveBeenCalled();
  });
});
