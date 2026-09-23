import { useEffect, useMemo } from 'react';

import { mergeServerQuota, quotaDayKey, type MealPhotoQuotaStatus } from '../lib/mealPhotoQuota';
import { useMealPhotoQuotaStore } from '../store/mealPhotoQuotaStore';
import { localTier, useSubscriptionStore } from '../store/subscriptionStore';

/**
 * Etat du quota photo pour l'ecran courant : compteur local + derniere
 * reponse du serveur + abonnement connu localement. Relance la synchro avec
 * le serveur a chaque montage, sans attendre sa reponse pour afficher.
 *
 * Partage par les DEUX entrees vers l'analyse (ecran photo et « Ajouter un
 * repas ») : un seul calcul, une seule regle.
 */
export function useMealPhotoQuota(): MealPhotoQuotaStatus {
  const date = useMealPhotoQuotaStore((s) => s.date);
  const mealsAnalyzed = useMealPhotoQuotaStore((s) => s.mealsAnalyzed);
  const server = useMealPhotoQuotaStore((s) => s.server);
  const syncServer = useMealPhotoQuotaStore((s) => s.syncServer);
  const entitlement = useSubscriptionStore((s) => s.entitlement);
  const initBilling = useSubscriptionStore((s) => s.init);

  useEffect(() => {
    void syncServer();
    void initBilling();
  }, [syncServer, initBilling]);

  return useMemo(
    () => mergeServerQuota({ date, mealsAnalyzed }, server, quotaDayKey(), localTier(entitlement)),
    [date, mealsAnalyzed, server, entitlement]
  );
}
