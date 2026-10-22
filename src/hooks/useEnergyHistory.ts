import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import {
  hasHealthPermissions,
  isHealthConnectAvailable,
  readDailyHealthHistory,
} from '../lib/healthConnect';
import {
  buildDailyHistory,
  historyStartDay,
  sessionCaloriesByDay,
  type DailyHealthData,
  type DailyHistoryEntry,
} from '../lib/energyHistory';
import { eachDayKey, localDayKey, startOfLocalDay } from '../lib/dateKeys';
import { useBodyWeightStore } from '../store/bodyWeightStore';
import { usePerformanceStore } from '../store/performanceStore';
import { useSessionStore } from '../store/sessionStore';

/**
 * Fenetre lue dans Health Connect. Au-dela, Health Connect ne renvoie de toute
 * facon rien sans la permission READ_HEALTH_DATA_HISTORY (ecartee) : lire plus
 * loin couterait sans rien rapporter.
 */
const HEALTH_LOOKBACK_DAYS = 400;
/** Borne du calcul jour par jour, pour qu'un historique tres ancien reste leger. */
const MAX_HISTORY_DAYS = 3 * 366;

export type HealthHistoryStatus = 'loading' | 'unavailable' | 'needsPermission' | 'granted';

/** Depense nette des seances d'AUJOURD'HUI, pour le bilan du jour. */
export function useTodaySessionKcal(): number {
  const sessions = useSessionStore((s) => s.sessions);
  const weightEntries = useBodyWeightStore((s) => s.entries);
  return useMemo(
    () => sessionCaloriesByDay(sessions, weightEntries).get(localDayKey(new Date())) ?? 0,
    [sessions, weightEntries]
  );
}

/**
 * Historique quotidien de la depense et des pas, reconstruit a la demande.
 * Relit Health Connect a chaque retour sur l'ecran ; le reste (seances,
 * pesees, profil) vient des stores et se recalcule seul.
 */
export function useEnergyHistory() {
  const sessions = useSessionStore((s) => s.sessions);
  const weightEntries = useBodyWeightStore((s) => s.entries);
  const sex = usePerformanceStore((s) => s.sex);
  const heightCm = usePerformanceStore((s) => s.heightCm);
  const ageYears = usePerformanceStore((s) => s.age);
  const activityLevel = usePerformanceStore((s) => s.activityLevel);

  const [health, setHealth] = useState<Map<string, DailyHealthData>>(new Map());
  const [healthStatus, setHealthStatus] = useState<HealthHistoryStatus>('loading');

  const loadHealth = useCallback(async () => {
    if (!(await isHealthConnectAvailable())) {
      setHealthStatus('unavailable');
      return;
    }
    if (!(await hasHealthPermissions())) {
      setHealthStatus('needsPermission');
      return;
    }
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - HEALTH_LOOKBACK_DAYS);
    const data = await readDailyHealthHistory(localDayKey(from), localDayKey(today));
    setHealth(data ?? new Map());
    setHealthStatus('granted');
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHealth();
    }, [loadHealth])
  );

  const daily = useMemo<DailyHistoryEntry[]>(() => {
    const today = new Date();
    const oldest = new Date(today);
    oldest.setDate(oldest.getDate() - MAX_HISTORY_DAYS);

    const start = historyStartDay(sessions, weightEntries, [...health.keys()], today);
    const from = start < localDayKey(oldest) ? oldest : startOfLocalDay(start);

    return buildDailyHistory({
      days: eachDayKey(from, today),
      health,
      sessionsByDay: sessionCaloriesByDay(sessions, weightEntries),
      weightEntries,
      profile: { sex, heightCm, ageYears, activityLevel },
    });
  }, [sessions, weightEntries, health, sex, heightCm, ageYears, activityLevel]);

  return { daily, healthStatus };
}
