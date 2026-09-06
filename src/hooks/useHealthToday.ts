import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  hasHealthPermissions,
  hasWeightPermission,
  isHealthConnectAvailable,
  readCaloriesBurnedToday,
  readLatestWeight,
  readStepsToday,
} from '../lib/healthConnect';
import { useBodyWeightStore } from '../store/bodyWeightStore';

export type HealthTodayData =
  | { status: 'unavailable' }
  | { status: 'needsPermission' }
  | {
      status: 'granted';
      calories: Awaited<ReturnType<typeof readCaloriesBurnedToday>>;
      steps: Awaited<ReturnType<typeof readStepsToday>>;
    };

/**
 * Lit les données Health Connect du jour (calories brûlées + pas) et les
 * rafraîchit à chaque fois que l'écran qui le consomme retrouve le focus.
 *
 * L'état exposé suit le cycle : indisponible → permission requise → données.
 *
 * Le poids suit un chemin différent des pas et des calories : il n'est pas
 * exposé par ce hook mais versé dans `bodyWeightStore`, qui est déjà la source
 * unique de l'accueil, de la progression et du bilan énergétique. Un seul
 * point d'écriture, aucune règle de priorité à dupliquer à l'affichage.
 * Sa permission est optionnelle : son refus ne bloque ni les pas ni les
 * calories.
 */
export function useHealthToday() {
  const [healthData, setHealthData] = useState<HealthTodayData>({
    status: 'unavailable',
  });

  const loadHealthToday = useCallback(async () => {
    const available = await isHealthConnectAvailable();
    if (!available) {
      setHealthData((prev) =>
        prev.status === 'unavailable' ? prev : { status: 'unavailable' }
      );
      return;
    }
    const granted = await hasHealthPermissions();
    if (!granted) {
      setHealthData((prev) =>
        prev.status === 'needsPermission' ? prev : { status: 'needsPermission' }
      );
      return;
    }
    const [calories, steps] = await Promise.all([
      readCaloriesBurnedToday(),
      readStepsToday(),
    ]);
    setHealthData({ status: 'granted', calories, steps });

    if (await hasWeightPermission()) {
      const sample = await readLatestWeight();
      if (sample) useBodyWeightStore.getState().syncHealthWeight(sample);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHealthToday();
    }, [loadHealthToday])
  );

  return { healthData, loadHealthToday };
}
