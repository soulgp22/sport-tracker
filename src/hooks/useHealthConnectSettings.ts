import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { appAlert } from '../components/ui/AppDialog';
import { useTranslation } from '../i18n/useTranslation';
import {
  getHealthConnectDiagnostics,
  openHealthConnectPermissionsForApp,
  openHealthConnectPlayStore,
  requestBackgroundReadPermission,
  revokeHealthPermissions,
  type HealthConnectDiagnostics,
} from '../lib/healthConnect';
import { readWidgetLastRefresh, type WidgetLastRefresh } from '../lib/widgets/dailyGoalsWidget';
import { useHealthConnectFlow } from './useHealthConnectFlow';

/**
 * Etat et actions de la section Health Connect de Parametres (2026-10-27) :
 * voir le statut, connecter, autoriser l'arriere-plan (widget), gerer les
 * autorisations, reinitialiser la connexion en cas de probleme.
 *
 * Relit tout a chaque retour sur l'ecran : l'utilisateur revient souvent de
 * l'app Health Connect apres avoir change un interrupteur.
 */
export function useHealthConnectSettings() {
  const { t } = useTranslation();
  const [diagnostics, setDiagnostics] = useState<HealthConnectDiagnostics | null>(null);
  const [lastRefresh, setLastRefresh] = useState<WidgetLastRefresh | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [next, refresh] = await Promise.all([getHealthConnectDiagnostics(), readWidgetLastRefresh()]);
    setDiagnostics(next);
    setLastRefresh(refresh);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const { connect, connecting } = useHealthConnectFlow(reload);

  const allowBackground = useCallback(async () => {
    setBusy(true);
    try {
      const granted = await requestBackgroundReadPermission();
      await reload();
      if (!granted) {
        appAlert(t('settings.health.backgroundDeniedTitle'), t('settings.health.backgroundDeniedMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.health.manage'), onPress: () => void openHealthConnectPermissionsForApp() },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }, [reload, t]);

  const runReset = useCallback(async () => {
    setBusy(true);
    try {
      const result = await revokeHealthPermissions();
      await reload();
      if (!result.ok) {
        appAlert(t('settings.health.resetErrorTitle'), result.error);
        return;
      }
      appAlert(
        t('settings.health.resetDoneTitle'),
        t(result.requiresRestart ? 'settings.health.resetRestartMessage' : 'settings.health.resetDoneMessage')
      );
    } finally {
      setBusy(false);
    }
  }, [reload, t]);

  const reset = useCallback(() => {
    appAlert(t('settings.health.resetConfirmTitle'), t('settings.health.resetConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.health.resetConfirm'), style: 'destructive', onPress: () => void runReset() },
    ]);
  }, [runReset, t]);

  return {
    diagnostics,
    lastRefresh,
    busy: busy || connecting,
    connect,
    allowBackground,
    reset,
    manage: openHealthConnectPermissionsForApp,
    install: openHealthConnectPlayStore,
    reload,
  };
}
