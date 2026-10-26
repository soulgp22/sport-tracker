import { useCallback, useState } from 'react';

import { appAlert } from '../components/ui/AppDialog';
import { healthConnectT as hct } from '../i18n/healthConnectFallback';
import { useTranslation } from '../i18n/useTranslation';
import {
  openHealthConnectPermissionsForApp,
  openHealthConnectPlayStore,
  requestHealthPermissionsWithStatus,
} from '../lib/healthConnect';

/**
 * Parcours complet de connexion a Health Connect, sorti de l'ecran Nutrition
 * (2026-10-26) pour etre lance depuis l'accueil (anneaux « Connecter ») et
 * Stats > Pas sans dupliquer ses messages.
 *
 * Jamais d'echec silencieux : chaque issue a son dialogue.
 * - accorde           → `onGranted` (l'appelant recharge ses donnees) ;
 * - non installe / a jour → proposer le Play Store ;
 * - erreur SDK        → message brut ;
 * - refuse            → ouvrir la page de permissions de l'app dans Health
 *   Connect ; un refus instantane (feuille jamais affichee) signale une app
 *   installee hors Play Store.
 */
export function useHealthConnectFlow(onGranted?: () => void | Promise<void>) {
  const { t } = useTranslation();
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const result = await requestHealthPermissionsWithStatus();
      if (result.granted) {
        await onGranted?.();
        return true;
      }
      if (result.status === 'not-installed' || result.status === 'needs-update') {
        const isUpdate = result.status === 'needs-update';
        appAlert(
          hct(t, isUpdate ? 'nutrition.healthConnect.updateTitle' : 'nutrition.healthConnect.installTitle'),
          hct(t, isUpdate ? 'nutrition.healthConnect.updateMessage' : 'nutrition.healthConnect.installMessage'),
          [
            { text: hct(t, 'nutrition.healthConnect.later'), style: 'cancel' },
            {
              text: hct(t, 'nutrition.healthConnect.openPlayStore'),
              onPress: () => void openHealthConnectPlayStore(),
            },
          ]
        );
        return false;
      }
      if (result.error) {
        appAlert(hct(t, 'nutrition.healthConnect.errorTitle'), result.error);
        return false;
      }
      appAlert(
        hct(t, 'nutrition.healthConnect.deniedTitle'),
        result.instantDenial
          ? hct(t, 'nutrition.healthConnect.sideloadedMessage')
          : `${hct(t, 'nutrition.healthConnect.deniedMessage')}\n\n(détail : statut=${result.status})`,
        [
          { text: hct(t, 'nutrition.healthConnect.later'), style: 'cancel' },
          {
            text: hct(t, 'nutrition.healthConnect.openSettings'),
            onPress: () => void openHealthConnectPermissionsForApp(),
          },
        ]
      );
      return false;
    } finally {
      setConnecting(false);
    }
  }, [onGranted, t]);

  return { connect, connecting };
}
