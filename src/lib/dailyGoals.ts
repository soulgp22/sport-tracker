/**
 * Objectifs du jour (pas, seances de la semaine, depense active) : calcul
 * headless de la progression vers chaque cible.
 *
 * Aucune dependance a l'interface ni aux stores : l'accueil ET le widget
 * Android consomment le meme instantane, calcule par la meme fonction, pour
 * que les deux affichent toujours le meme chiffre.
 *
 * Regle : une valeur inconnue (pas de Health Connect, profil incomplet) donne
 * un anneau `unavailable`, jamais un 0 ni une estimation deguisee en mesure.
 */

export const DEFAULT_STEPS_GOAL = 8000;
export const DEFAULT_ACTIVE_KCAL_GOAL = 400;

export const STEPS_GOAL_LIMITS = { minimum: 1000, maximum: 40000, step: 500 } as const;
export const ACTIVE_KCAL_GOAL_LIMITS = { minimum: 50, maximum: 3000, step: 50 } as const;

export interface DailyGoalTargets {
  /** Pas par jour. */
  stepsGoal: number;
  /** Depense active (hors metabolisme de base) par jour, en kcal. */
  activeKcalGoal: number;
  /** Seances par semaine (objectif deja porte par le profil de performance). */
  weeklySessionGoal: number;
}

export interface DailyGoalInputs {
  /** Pas du jour, `null` quand Health Connect ne les fournit pas. */
  steps: number | null;
  /** Depense active du jour, `null` sans mesure ni estimation fondee. */
  activeKcal: number | null;
  /** Seances terminees depuis le lundi. */
  sessionsThisWeek: number;
}

export type GoalRingState =
  | {
      kind: 'progress';
      value: number;
      goal: number;
      /** Progression bornee a 1. */
      ratio: number;
      reached: boolean;
    }
  | { kind: 'unavailable'; goal: number };

export interface DailyGoalsSnapshot {
  steps: GoalRingState;
  sessions: GoalRingState;
  activeKcal: GoalRingState;
}

function ringState(value: number | null, goal: number): GoalRingState {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return { kind: 'unavailable', goal };
  }
  const rounded = Math.round(value);
  const ratio = goal > 0 ? Math.min(1, rounded / goal) : 0;
  return { kind: 'progress', value: rounded, goal, ratio, reached: goal > 0 && rounded >= goal };
}

export function buildDailyGoalsSnapshot(
  inputs: DailyGoalInputs,
  targets: DailyGoalTargets
): DailyGoalsSnapshot {
  return {
    steps: ringState(inputs.steps, targets.stepsGoal),
    sessions: ringState(inputs.sessionsThisWeek, targets.weeklySessionGoal),
    activeKcal: ringState(inputs.activeKcal, targets.activeKcalGoal),
  };
}

/** Borne un objectif a ses limites, en entier ; une valeur invalide rend le defaut. */
export function clampGoal(
  value: unknown,
  limits: { minimum: number; maximum: number },
  fallback: number
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(limits.maximum, Math.max(limits.minimum, Math.round(value)));
}
