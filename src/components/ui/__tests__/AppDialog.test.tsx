import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { AppDialog, appAlert } from '../AppDialog';

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
});
