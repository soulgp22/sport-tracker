import { act, renderHook } from '@testing-library/react-native';

import { appAlert } from '../../components/ui/AppDialog';
import {
  openHealthConnectPermissionsForApp,
  openHealthConnectPlayStore,
  requestBackgroundReadPermission,
  requestHealthPermissionsWithStatus,
} from '../../lib/healthConnect';
import { useHealthConnectFlow } from '../useHealthConnectFlow';

jest.mock('../../components/ui/AppDialog', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/healthConnect', () => ({
  requestHealthPermissionsWithStatus: jest.fn(),
  openHealthConnectPermissionsForApp: jest.fn(() => Promise.resolve(true)),
  openHealthConnectPlayStore: jest.fn(() => Promise.resolve()),
  requestBackgroundReadPermission: jest.fn(() => Promise.resolve(true)),
}));

const request = requestHealthPermissionsWithStatus as jest.Mock;
const alert = appAlert as jest.Mock;

beforeEach(() => {
  request.mockReset();
  alert.mockReset();
  (openHealthConnectPermissionsForApp as jest.Mock).mockClear();
  (openHealthConnectPlayStore as jest.Mock).mockClear();
  (requestBackgroundReadPermission as jest.Mock).mockClear();
});

describe('useHealthConnectFlow', () => {
  it('permission accordee : rappelle onGranted, aucun dialogue', async () => {
    request.mockResolvedValue({ status: 'available', granted: true });
    const onGranted = jest.fn();
    const { result } = renderHook(() => useHealthConnectFlow(onGranted));

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.connect();
    });

    expect(outcome).toBe(true);
    // Seconde feuille : lecture en arriere-plan pour le widget, AVANT la relecture.
    expect(requestBackgroundReadPermission).toHaveBeenCalledTimes(1);
    expect(onGranted).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
    expect(result.current.connecting).toBe(false);
  });

  it('Health Connect absent : propose le Play Store, onGranted jamais appele', async () => {
    request.mockResolvedValue({ status: 'not-installed', granted: false });
    const onGranted = jest.fn();
    const { result } = renderHook(() => useHealthConnectFlow(onGranted));

    await act(async () => {
      await result.current.connect();
    });

    expect(onGranted).not.toHaveBeenCalled();
    expect(requestBackgroundReadPermission).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, , buttons] = alert.mock.calls[0];
    expect(title).toMatch(/pas installé/);
    buttons[1].onPress();
    expect(openHealthConnectPlayStore).toHaveBeenCalled();
  });

  it('permission refusee : guide vers la page de permissions de l’app', async () => {
    request.mockResolvedValue({ status: 'available', granted: false, instantDenial: false });
    const { result } = renderHook(() => useHealthConnectFlow());

    await act(async () => {
      await result.current.connect();
    });

    const [title, message, buttons] = alert.mock.calls[0];
    expect(title).toMatch(/non accordées/);
    expect(message).toContain('statut=available');
    buttons[1].onPress();
    expect(openHealthConnectPermissionsForApp).toHaveBeenCalled();
  });

  it('refus instantane : explique le blocage des applis hors Play Store', async () => {
    request.mockResolvedValue({ status: 'available', granted: false, instantDenial: true });
    const { result } = renderHook(() => useHealthConnectFlow());

    await act(async () => {
      await result.current.connect();
    });

    expect(alert.mock.calls[0][1]).toMatch(/hors Play Store/);
  });

  it('erreur du SDK : le message brut est montre', async () => {
    request.mockResolvedValue({ status: 'available', granted: false, error: 'client is not initialized' });
    const { result } = renderHook(() => useHealthConnectFlow());

    await act(async () => {
      await result.current.connect();
    });

    expect(alert).toHaveBeenCalledWith(expect.stringMatching(/impossible/), 'client is not initialized');
  });
});
