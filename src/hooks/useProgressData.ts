import { useMemo } from 'react';
import { useSessionStore } from '../store/sessionStore';
import { getCatalogExerciseName } from '../store/exerciseCatalogStore';

export interface DataPoint {
  date: string;    // ISO date string (YYYY-MM-DD)
  label: string;   // display label (DD/MM)
  value: number;
}

export interface ProgressData {
  maxWeightPoints: DataPoint[];
  volumePoints: DataPoint[];
}

function toLabel(isoDate: string) {
  const d = new Date(isoDate);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function useProgressData(exerciseId: string): ProgressData {
  const getSessionsForExercise = useSessionStore((s) => s.getSessionsForExercise);

  return useMemo(() => {
    const sessions = getSessionsForExercise(exerciseId);

    // Sort chronologically
    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

    const maxWeightPoints: DataPoint[] = [];
    const volumePoints: DataPoint[] = [];

    for (const session of sorted) {
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex) continue;

      const completedSets = ex.sets.filter((s) => s.completed);
      if (completedSets.length === 0) continue;

      const dayKey = session.date.slice(0, 10);
      const label = toLabel(session.date);

      const maxWeight = Math.max(...completedSets.map((s) => s.actualWeight));
      const volume = completedSets.reduce((sum, s) => sum + s.actualReps * s.actualWeight, 0);

      maxWeightPoints.push({ date: dayKey, label, value: maxWeight });
      volumePoints.push({ date: dayKey, label, value: volume });
    }

    return { maxWeightPoints, volumePoints };
  }, [exerciseId, getSessionsForExercise]);
}

export function useExercisesWithHistory() {
  const sessions = useSessionStore((s) => s.sessions);

  return useMemo(() => {
    const map = new Map<string, { id: string; name: string; sessionCount: number }>();
    for (const session of sessions) {
      for (const ex of session.exercises) {
        const existing = map.get(ex.exerciseId);
        if (existing) {
          existing.sessionCount += 1;
        } else {
          map.set(ex.exerciseId, {
            id: ex.exerciseId,
            name: getCatalogExerciseName(ex.exerciseId, ex.exerciseName),
            sessionCount: 1,
          });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.sessionCount - a.sessionCount);
  }, [sessions]);
}
