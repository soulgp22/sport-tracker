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

import type { DailyEnergyExpenditure } from './energyBalance';

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

/** Les trois anneaux de l'accueil. */
export type GoalRingKind = 'steps' | 'sessions' | 'activeKcal';

/** Pourquoi la depense est inconnue : profil incomplet, ou aucune donnee du jour. */
export type ActiveKcalUnavailableReason = 'profile' | 'data';

/**
 * Ce que fait un appui sur un anneau :
 * - `history`        : ouvrir l'onglet Stats correspondant ;
 * - `connectHealth`  : lancer la demande de permission Health Connect ;
 * - `completeProfile`: ouvrir le profil pour le completer.
 */
export type GoalRingTapAction = 'history' | 'connectHealth' | 'completeProfile';

/**
 * Regle d'aiguillage d'un appui sur un anneau de l'accueil.
 *
 * Un anneau qui affiche « Connecter » doit lancer la connexion, pas ouvrir un
 * historique vide (retour d'Islam, 2026-10-26). Un anneau qui affiche
 * « Profil » doit mener au profil. Un anneau avec une progression ouvre son
 * historique.
 */
export function resolveGoalRingTap(
  ring: GoalRingKind,
  state: GoalRingState,
  activeKcalUnavailableReason: ActiveKcalUnavailableReason
): GoalRingTapAction {
  // Une progression, meme a zero, a un historique a montrer.
  if (state.kind === 'progress') return 'history';
  // La reponse colle au libelle affiche : « Connecter » lance la connexion,
  // « Profil » mene au profil.
  if (ring === 'activeKcal' && activeKcalUnavailableReason === 'profile') return 'completeProfile';
  // Pas sans donnee = Health Connect absent ; seances indisponibles (ne devrait
  // pas arriver) : l'historique reste la reponse la moins trompeuse.
  return ring === 'sessions' ? 'history' : 'connectHealth';
}

/**
 * Depense active qui compte vers l'objectif, a partir de la depense du jour.
 * Partagee par l'accueil et le widget (meme chiffre aux deux endroits) :
 * - mesure Health Connect ou estimation pas + seances : l'activite du jour ;
 * - Health Connect connecte, profil complet, mais rien encore aujourd'hui : 0,
 *   pas « inconnue » (l'anneau ne redit pas « Connecter ») ;
 * - sinon (repli « habituel » du profil, constante) : null, jamais une
 *   progression inventee.
 */
export function goalActiveKcalFrom(
  expenditure: Pick<DailyEnergyExpenditure, 'activityKcal' | 'basalKcal' | 'breakdown'>,
  healthGranted: boolean
): number | null {
  const mode = expenditure.breakdown.mode;
  if (mode === 'measured' || mode === 'estimated') return expenditure.activityKcal;
  return healthGranted && expenditure.basalKcal !== null ? 0 : null;
}
