import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FoodForm, type FoodFormValues } from '../FoodForm';

describe('FoodForm', () => {
  const baseProps = {
    categories: ['Fruits', 'Légumes', 'Viandes'],
    submitLabel: 'Créer',
    onSubmit: (_values: FoodFormValues) => {},
  };

  it('prefills name from initialName when initialFood is absent', async () => {
    render(<FoodForm {...baseProps} initialName="Riz basmati" />);
    const input = screen.getByDisplayValue('Riz basmati');
    expect(input).toBeTruthy();
  });

  it('ignores initialName when initialFood is provided', async () => {
    render(
      <FoodForm
        {...baseProps}
        initialFood={{
          id: 'poulet',
          name: 'Poulet grillé',
          category: 'Viandes',
          unit: 'g',
          nutritionPer100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
          isCustom: true,
        }}
        initialName="Riz basmati"
      />
    );
    const input = screen.getByDisplayValue('Poulet grillé');
    expect(input).toBeTruthy();
    // initialName must not win
    expect(screen.queryByDisplayValue('Riz basmati')).toBeNull();
  });

  it('shows empty name when neither initialFood nor initialName are provided', async () => {
    render(<FoodForm {...baseProps} />);
    // When no name is provided, the name field should be empty.
    // We verify that the form renders without a pre-existing name.
    expect(screen.queryByDisplayValue('Riz basmati')).toBeNull();
    expect(screen.queryByDisplayValue('Poulet grillé')).toBeNull();
    // The form renders its submit button, which confirms it's functional.
    expect(screen.getByText('Créer')).toBeTruthy();
  });
});
