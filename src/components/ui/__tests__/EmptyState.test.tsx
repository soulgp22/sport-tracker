import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title', async () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText('No data')).toBeTruthy();
  });

  it('renders subtitle when provided', async () => {
    render(<EmptyState title="Empty" subtitle="Add something" />);
    expect(screen.getByText('Add something')).toBeTruthy();
  });

  it('does not render subtitle when not provided', async () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText('Add something')).toBeNull();
  });
});
