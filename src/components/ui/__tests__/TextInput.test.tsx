import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TextInput } from '../TextInput';

describe('TextInput', () => {
  it('renders with a label', async () => {
    render(<TextInput label="Name" />);
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('renders without a label', async () => {
    render(<TextInput />);
    expect(screen.queryByText('Name')).toBeNull();
  });

  it('displays error message', async () => {
    render(<TextInput error="Required field" />);
    expect(screen.getByText('Required field')).toBeTruthy();
  });

  it('renders placeholder text', async () => {
    render(<TextInput placeholder="Enter name" />);
    expect(screen.getByPlaceholderText('Enter name')).toBeTruthy();
  });
});
