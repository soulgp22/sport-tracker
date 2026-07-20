import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AppDialog, appAlert } from '../AppDialog';

function generateLongMessage(lines: number): string {
  return Array.from({ length: lines }, (_, i) => `Ligne de test numéro ${i + 1} pour vérifier le défilement du dialogue.`)
    .join('\n');
}

describe('AppDialog', () => {
  it('keeps a dialog opened by an action callback visible', async () => {
    render(<AppDialog />);

    act(() => {
      appAlert('Supprimer ?', 'Cette action est définitive.', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => appAlert('Terminé', 'La suppression a réussi.'),
        },
      ]);
    });

    expect(screen.getByText('Supprimer ?')).toBeTruthy();
    fireEvent.press(screen.getByText('Supprimer'));

    expect(await screen.findByText('Terminé')).toBeTruthy();
    fireEvent.press(screen.getByText('OK'));
  });

  it('constrains body message area and keeps actions visible with a very long message (40+ lines)', () => {
    render(<AppDialog />);

    const longMessage = generateLongMessage(45);

    act(() => {
      appAlert('Exercices inconnus', longMessage, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'default' },
      ]);
    });

    // The title must be visible
    expect(screen.getByText('Exercices inconnus')).toBeTruthy();

    // Both buttons must be present
    expect(screen.getByText('Annuler')).toBeTruthy();
    expect(screen.getByText('Confirmer')).toBeTruthy();

    // The first and last lines of the message must exist
    expect(screen.getByText(/Ligne de test numéro 1/)).toBeTruthy();
    expect(screen.getByText(/Ligne de test numéro 45/)).toBeTruthy();

    // The card must have a numeric maxHeight (pixels derived from window height),
    // NOT a percentage string. A percentage-based maxHeight does not resolve
    // against a parent without explicit height — that was the original bug.
    // If someone reverts to `maxHeight: '82%'` this assertion will fail because
    // typeof '82%' is 'string', not 'number'.
    const card = screen.getByTestId('app-dialog-card');
    const cardStyle = StyleSheet.flatten(card?.props?.style);
    expect(cardStyle?.maxHeight).toEqual(expect.any(Number));
  });
});