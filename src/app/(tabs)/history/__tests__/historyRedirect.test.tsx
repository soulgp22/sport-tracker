import React from 'react';
import { render } from '@testing-library/react-native';

import HistoryScreen from '../index';

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props);
    return null;
  },
}));

describe('HistoryScreen (redirection)', () => {
  it("redirige vers l'onglet Séances de l'écran Stats", () => {
    render(<HistoryScreen />);

    expect(mockRedirect).toHaveBeenCalledWith({ href: '/(tabs)/progress?tab=sessions' });
  });
});
