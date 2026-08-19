import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  hasHealthPermissions,
  isHealthConnectAvailable,
  readCaloriesBurnedToday,
  readStepsToday,
} from '../lib/healthConnect';

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHealthToday();
    }, [loadHealthToday])
  );

  return { healthData, loadHealthToday };
}
