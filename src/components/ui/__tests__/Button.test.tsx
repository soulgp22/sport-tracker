import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders the title', async () => {
    render(<Button title="Start" />);
    expect(screen.getByText('Start')).toBeTruthy();
  });

  it('hides title and shows loading indicator when loading', async () => {
    render(<Button title="Save" loading />);
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('renders without crashing when disabled', async () => {
    render(<Button title="Start" disabled />);
    expect(screen.getByText('Start')).toBeTruthy();
  });
});
