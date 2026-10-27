/**
 * Recalcul des anneaux du widget en ARRIERE-PLAN, sans ouvrir l'app.
 *
 * Retour d'Islam (2026-10-27) : le widget ne se mettait a jour qu'a
 * l'ouverture de l'app. Le gestionnaire headless ne faisait que relire
 * l'instantane, et ses lectures Health Connect etaient refusees hors premier
 * plan (permission d'arriere-plan absente, voir lib/healthConnect).
 *
 * Fonction pure : memes regles que l'accueil (`resolveDailyEnergyExpenditure`
 * avec les memes entrees, `goalActiveKcalFrom`, `buildDailyGoalsSnapshot`),
 * donc le meme chiffre aux deux endroits.
 *
 * Regles de temps :
 * - autre jour que l'instantane : les seances du jour repartent a 0 kcal, et
 *   sans lecture fraiche les pas et la depense deviennent inconnus (jamais les
 *   chiffres d'hier presentes comme ceux du jour) ;
 * - autre semaine : le compteur de seances repart a 0.
 */
import { localDayKey } from '../dateKeys';
import { buildDailyGoalsSnapshot, goalActiveKcalFrom, type DailyGoalsSnapshot } from '../dailyGoals';
import { resolveDailyEnergyExpenditure } from '../energyBalance';
import { weekStartKey } from '../performanceEngine';
import { expireDailyGoalsWidgetSnapshot, type DailyGoalsWidgetSnapshot } from './dailyGoalsWidgetSnapshot';

/** Pas du jour lus en arriere-plan, `null` si la lecture a echoue. */
export type FreshSteps = number | null;

export function refreshDailyGoalsSnapshot(
  stored: DailyGoalsWidgetSnapshot,
  freshSteps: FreshSteps,
  now: Date
): DailyGoalsSnapshot {
  const sameDay = stored.dayKey === localDayKey(now);
  const inputs = stored.inputs;

  if (!inputs) {
    // Instantane anterieur a 1.39.4 : seuls les pas peuvent etre rafraichis.
    const base = expireDailyGoalsWidgetSnapshot(stored, now).snapshot;
    if (freshSteps === null) return base;
    const steps = buildDailyGoalsSnapshot(
      { steps: freshSteps, activeKcal: null, sessionsThisWeek: 0 },
      { stepsGoal: base.steps.goal, activeKcalGoal: 1, weeklySessionGoal: 1 }
    ).steps;
    return { ...base, steps };
  }

  const sessionsThisWeek = inputs.weekKey === weekStartKey(now) ? inputs.sessionsThisWeek : 0;

  if (freshSteps === null) {
    // Aucune lecture fraiche : le meme jour, l'instantane de l'app reste la
    // meilleure information ; un autre jour, pas et depense sont inconnus.
    const base = sameDay ? stored.snapshot : expireDailyGoalsWidgetSnapshot(stored, now).snapshot;
    const sessions = buildDailyGoalsSnapshot(
      { steps: null, activeKcal: null, sessionsThisWeek },
      inputs.targets
    ).sessions;
    return { ...base, sessions };
  }

  const expenditure = resolveDailyEnergyExpenditure({
    healthCalories: null,
    healthSteps: freshSteps,
    profile: inputs.profile,
    sessionKcal: sameDay ? inputs.sessionKcalToday : 0,
  });
  return buildDailyGoalsSnapshot(
    {
      steps: freshSteps,
      // Une lecture a reussi : Health Connect est connecte.
      activeKcal: goalActiveKcalFrom(expenditure, true),
      sessionsThisWeek,
    },
    inputs.targets
  );
}
