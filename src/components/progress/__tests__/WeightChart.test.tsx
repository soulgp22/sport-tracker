import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { WeightChart } from '../WeightChart';
import type { DataPoint } from '../../../hooks/useProgressData';

describe('WeightChart', () => {
  it('shows empty message when no data', async () => {
    render(<WeightChart data={[]} />);
    expect(screen.getByText('Pas encore de données')).toBeTruthy();
  });

  it('renders a chart when data is provided', async () => {
    const data: DataPoint[] = [
      { date: '2026-06-10', label: '10/06', value: 60 },
      { date: '2026-06-17', label: '17/06', value: 65 },
    ];
    render(<WeightChart data={data} />);
    expect(screen.getByText('Poids maximum (kg)')).toBeTruthy();
    expect(screen.getByTestId('line-chart')).toBeTruthy();
  });
});
