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

  it('renders primary action when provided', async () => {
    render(
      <EmptyState title="Empty" actionLabel="Go" onAction={() => {}} />
    );
    expect(screen.getByText('Go')).toBeTruthy();
  });

  it('renders only primary action when secondary action is not provided — non-regression', async () => {
    render(
      <EmptyState title="Empty" actionLabel="Scan" onAction={() => {}} />
    );
    // Primary action is visible
    expect(screen.getByText('Scan')).toBeTruthy();
    // No secondary action rendered
    expect(screen.queryByText('Type')).toBeNull();
  });

  it('renders both actions when primary and secondary are provided', async () => {
    render(
      <EmptyState
        title="Empty"
        actionLabel="Scan"
        onAction={() => {}}
        secondaryActionLabel="Type"
        onSecondaryAction={() => {}}
      />
    );
    // Both labels are visible
    expect(screen.getByText('Scan')).toBeTruthy();
    expect(screen.getByText('Type')).toBeTruthy();
  });

  it('does not render secondary button when secondaryActionLabel is missing', async () => {
    render(
      <EmptyState
        title="Empty"
        actionLabel="Scan"
        onAction={() => {}}
        onSecondaryAction={() => {}}
      />
    );
    // Primary is there
    expect(screen.getByText('Scan')).toBeTruthy();
    // But no secondary because label is missing
    expect(screen.queryByText('Type')).toBeNull();
  });
});

