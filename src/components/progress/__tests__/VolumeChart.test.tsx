import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { VolumeChart } from '../VolumeChart';
import type { DataPoint } from '../../../hooks/useProgressData';

describe('VolumeChart', () => {
  it('shows empty message when no data', async () => {
    render(<VolumeChart data={[]} />);
    expect(screen.getByText('Pas encore de données')).toBeTruthy();
  });

  it('renders a chart when data is provided', async () => {
    const data: DataPoint[] = [
      { date: '2026-06-10', label: '10/06', value: 600 },
      { date: '2026-06-17', label: '17/06', value: 800 },
    ];
    render(<VolumeChart data={data} />);
    expect(screen.getByText('Volume (kg·reps)')).toBeTruthy();
    expect(screen.getByTestId('bar-chart')).toBeTruthy();
  });
});
