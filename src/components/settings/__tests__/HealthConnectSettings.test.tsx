import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { HealthConnectSettings, healthStatusKey } from '../HealthConnectSettings';
import { appAlert } from '../../ui/AppDialog';
import {
  getHealthConnectDiagnostics,
  openHealthConnectPermissionsForApp,
  requestBackgroundReadPermission,
  requestHealthPermissionsWithStatus,
  revokeHealthPermissions,
} from '../../../lib/healthConnect';
import { readWidgetLastRefresh } from '../../../lib/widgets/dailyGoalsWidget';
import { useLanguageStore } from '../../../store/languageStore';

jest.mock('expo-router', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  return {
    useFocusEffect: (effect: () => void) => {
      ReactLocal.useEffect(effect, [effect]);
    },
  };
});
jest.mock('../../ui/AppDialog', () => ({ appAlert: jest.fn() }));
jest.mock('../../../lib/widgets/dailyGoalsWidget', () => ({ readWidgetLastRefresh: jest.fn() }));
jest.mock('../../../lib/healthConnect', () => ({
  getHealthConnectDiagnostics: jest.fn(),
  openHealthConnectPermissionsForApp: jest.fn(() => Promise.resolve(true)),
  openHealthConnectPlayStore: jest.fn(() => Promise.resolve()),
  requestBackgroundReadPermission: jest.fn(() => Promise.resolve(true)),
  requestHealthPermissionsWithStatus: jest.fn(() => Promise.resolve({ status: 'available', granted: true })),
  revokeHealthPermissions: jest.fn(() => Promise.resolve({ ok: true, requiresRestart: true })),
}));

const diagnostics = getHealthConnectDiagnostics as jest.Mock;
const alert = appAlert as jest.Mock;

const CONNECTED = {
  status: 'available',
  connected: true,
  steps: true,
  activeCalories: true,
  totalCalories: true,
  background: true,
  backgroundSupported: true,
};
const DISCONNECTED = { ...CONNECTED, connected: false, steps: false, activeCalories: false, totalCalories: false, background: false };

async function renderSettings() {
  render(<HealthConnectSettings />);
  await act(async () => {});
}

beforeEach(() => {
  useLanguageStore.setState({ language: 'fr' });
  jest.clearAllMocks();
  (readWidgetLastRefresh as jest.Mock).mockResolvedValue(null);
});

describe('healthStatusKey', () => {
  it('traduit chaque etat Health Connect en libelle', () => {
    expect(healthStatusKey(null)).toBe('loading');
    expect(healthStatusKey({ ...DISCONNECTED, status: 'not-installed' } as never)).toBe('notInstalled');
    expect(healthStatusKey({ ...DISCONNECTED, status: 'needs-update' } as never)).toBe('needsUpdate');
    expect(healthStatusKey({ ...DISCONNECTED, status: 'unavailable' } as never)).toBe('unavailable');
    expect(healthStatusKey(DISCONNECTED as never)).toBe('disconnected');
    expect(healthStatusKey(CONNECTED as never)).toBe('connected');
  });
});

describe('HealthConnectSettings', () => {
  it('non connecte : statut, et « Connecter » lance la demande puis relit le statut', async () => {
    diagnostics.mockResolvedValueOnce(DISCONNECTED).mockResolvedValue(CONNECTED);
    await renderSettings();

    expect(screen.getByTestId('settings-health-status').props.children).toBe('Non connecté');
    await act(async () => {
      fireEvent.press(screen.getByText('Connecter Health Connect'));
    });

    expect(requestHealthPermissionsWithStatus).toHaveBeenCalledTimes(1);
    expect(requestBackgroundReadPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings-health-status').props.children).toBe('Connecté');
    expect(screen.queryByText('Connecter Health Connect')).toBeNull();
  });

  it('connecte : chaque autorisation est listee, avec l’etat du widget', async () => {
    diagnostics.mockResolvedValue(CONNECTED);
    (readWidgetLastRefresh as jest.Mock).mockResolvedValue({ at: '2026-10-27T13:05:00.000Z', ok: true, steps: 6240 });
    await renderSettings();

    expect(screen.getByTestId('settings-health-status').props.children).toBe('Connecté');
    expect(screen.getByText('Mise à jour du widget en arrière-plan')).toBeTruthy();
    expect(screen.getByText(/arrière-plan permet au widget/)).toBeTruthy();
    expect(screen.getAllByText('Autorisé')).toHaveLength(4);
    expect(screen.getByTestId('settings-health-last-refresh').props.children).toMatch(/6.240 pas/);
    // Arriere-plan deja accorde : pas de bouton pour le redemander.
    expect(screen.queryByText('Autoriser la mise à jour en arrière-plan')).toBeNull();
  });

  it('arriere-plan manquant : le bouton le demande ; un refus guide vers les autorisations', async () => {
    diagnostics.mockResolvedValue({ ...CONNECTED, background: false });
    (requestBackgroundReadPermission as jest.Mock).mockResolvedValueOnce(false);
    (readWidgetLastRefresh as jest.Mock).mockResolvedValue({ at: '2026-10-27T13:05:00.000Z', ok: false, reason: 'x' });
    await renderSettings();

    expect(screen.getByTestId('settings-health-last-refresh').props.children).toMatch(/lecture refusée/);
    await act(async () => {
      fireEvent.press(screen.getByText('Autoriser la mise à jour en arrière-plan'));
    });

    expect(requestBackgroundReadPermission).toHaveBeenCalledTimes(1);
    const [title, , buttons] = alert.mock.calls[0];
    expect(title).toBe('Arrière-plan non autorisé');
    buttons[1].onPress();
    expect(openHealthConnectPermissionsForApp).toHaveBeenCalled();
  });

  it('réinitialiser : confirmation, retrait des autorisations, puis consigne de redémarrage', async () => {
    diagnostics.mockResolvedValue(CONNECTED);
    await renderSettings();

    fireEvent.press(screen.getByText('Réinitialiser la connexion'));
    const [confirmTitle, , confirmButtons] = alert.mock.calls[0];
    expect(confirmTitle).toBe('Réinitialiser la connexion ?');
    expect(revokeHealthPermissions).not.toHaveBeenCalled();

    await act(async () => {
      confirmButtons[1].onPress();
    });

    expect(revokeHealthPermissions).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[1][0]).toBe('Connexion réinitialisée');
    expect(alert.mock.calls[1][1]).toMatch(/ferme complètement/);
  });

  it('échec du retrait : le message natif est montré', async () => {
    diagnostics.mockResolvedValue(CONNECTED);
    (revokeHealthPermissions as jest.Mock).mockResolvedValueOnce({ ok: false, error: 'client not available' });
    await renderSettings();

    fireEvent.press(screen.getByText('Réinitialiser la connexion'));
    await act(async () => {
      alert.mock.calls[0][2][1].onPress();
    });

    expect(alert).toHaveBeenLastCalledWith('Réinitialisation impossible', 'client not available');
  });

  /**
   * Regression 1.39.4 (vc 61) : la permission d'arriere-plan a ete retiree du
   * manifeste (refus Google Play). L'ecran ne doit plus la montrer ni la
   * proposer : un bouton qui la demanderait toucherait une permission non
   * declaree, et la ligne « Refuse » serait un etat que l'utilisateur ne peut
   * pas corriger.
   */
  it('arriere-plan non declare dans ce build : ni ligne, ni bouton, ni etat du widget', async () => {
    diagnostics.mockResolvedValue({ ...CONNECTED, background: false, backgroundSupported: false });
    (readWidgetLastRefresh as jest.Mock).mockResolvedValue({ at: '2026-10-27T13:05:00.000Z', ok: false, reason: 'x' });
    await renderSettings();

    expect(screen.getByTestId('settings-health-status').props.children).toBe('Connecté');
    expect(screen.getAllByText('Autorisé')).toHaveLength(3);
    expect(screen.queryByTestId('settings-health-perm-background')).toBeNull();
    expect(screen.queryByText('Autoriser la mise à jour en arrière-plan')).toBeNull();
    expect(screen.queryByTestId('settings-health-last-refresh')).toBeNull();
    // L'aide ne promet plus une mise a jour du widget app fermee.
    expect(screen.getByText('Les pas et les calories viennent de Health Connect.')).toBeTruthy();
    expect(screen.queryByText(/arrière-plan permet au widget/)).toBeNull();
    expect(screen.getByText('Réinitialiser la connexion')).toBeTruthy();
  });

  it('Health Connect absent : propose le Play Store, aucune action de connexion', async () => {
    diagnostics.mockResolvedValue({ ...DISCONNECTED, status: 'not-installed' });
    await renderSettings();

    expect(screen.getByTestId('settings-health-status').props.children).toBe("Health Connect n'est pas installé");
    expect(screen.getByText('Ouvrir le Play Store')).toBeTruthy();
    expect(screen.queryByText('Connecter Health Connect')).toBeNull();
    expect(screen.queryByText('Réinitialiser la connexion')).toBeNull();
  });
});
