import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProgramCard } from '../ProgramCard';
import type { Program } from '../../../types';

const makeProgram = (overrides: Partial<Program> = {}): Program => ({
  id: 'p1',
  name: 'PPL',
  days: [
    {
      id: 'd1', name: 'Push', order: 0,
      exercises: [
        { id: 'e1', exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, sets: [{ reps: 10, weight: 60, restSeconds: 90 }] },
      ],
    },
    { id: 'd2', name: 'Pull', order: 1, exercises: [] },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('ProgramCard', () => {
  it('renders program name and metadata', async () => {
    const onPress = jest.fn();
    const onDelete = jest.fn();
    render(<ProgramCard program={makeProgram()} onPress={onPress} onDelete={onDelete} />);
    expect(screen.getByText('PPL')).toBeTruthy();
    expect(screen.getByText(/2 jours/)).toBeTruthy();
    expect(screen.getByText(/1 exercice/)).toBeTruthy();
  });

  it('handles singular day/exercise count', async () => {
    const program = makeProgram({
      days: [{
        id: 'd1', name: 'Push', order: 0,
        exercises: [{ id: 'e1', exerciseId: 'ex1', exerciseName: 'Bench Press', order: 0, sets: [{ reps: 10, weight: 60, restSeconds: 90 }] }],
      }],
    });
    render(<ProgramCard program={program} onPress={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText(/1 jour/)).toBeTruthy();
    expect(screen.getByText(/1 exercice/)).toBeTruthy();
  });

  it('renders the selected gym logo and name', () => {
    render(
      <ProgramCard
        program={makeProgram({ gymProfileId: 'basic-fit' })}
        onPress={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getAllByLabelText('Basic-Fit').length).toBeGreaterThan(0);
    expect(screen.getByText('Basic-Fit')).toBeTruthy();
  });
});
