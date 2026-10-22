/**
 * Repartition de la depense par source (A01).
 *
 * La regle qu'on protege : deux modes EXCLUSIFS, pour ne jamais compter deux
 * fois la meme energie. Quand Health Connect mesure l'activite, il inclut deja
 * la marche et les seances ; quand il ne mesure rien, l'app additionne pas et
 * seances qu'elle estime elle-meme.
 */
import { estimateActiveCaloriesFromSteps, resolveDailyEnergyExpenditure } from '../energyBalance';
import type { EnergyProfile } from '../energyBalance';

const homme80kg: EnergyProfile = {
  sex: 'male',
  weightKg: 80,
  heightCm: 180,
  ageYears: 30,
  activityLevel: 'sedentary',
};
const BMR = 1780;

describe('Repartition de la depense — mode mesure', () => {
  it('prend l’activite mesuree et n’y ajoute PAS les seances', () => {
    const r = resolveDailyEnergyExpenditure({
      healthCalories: { active: 450, total: 0 },
      healthSteps: 9000,
      profile: homme80kg,
      sessionKcal: 250,
    });

    expect(r.breakdown.mode).toBe('measured');
    expect(r.activityKcal).toBe(450);
    expect(r.totalKcal).toBe(BMR + 450);
    // Les seances restent visibles, mais hors du total.
    expect(r.breakdown.sessionsKcal).toBe(250);
    expect(r.breakdown.sessionsIncluded).toBe(false);
  });

  it('calcule quand meme les calories liees aux pas pour la vue « pas »', () => {
    const r = resolveDailyEnergyExpenditure({
      healthCalories: { active: 450, total: 0 },
      healthSteps: 9000,
      profile: homme80kg,
    });

    expect(r.breakdown.stepsKcal).toBe(estimateActiveCaloriesFromSteps(9000, 80).activeCaloriesKcal);
    expect(r.totalKcal).toBe(BMR + 450);
  });
});

describe('Repartition de la depense — mode estime', () => {
  it('additionne pas et seances quand rien n’est mesure', () => {
    const steps = estimateActiveCaloriesFromSteps(9000, 80).activeCaloriesKcal;
    const r = resolveDailyEnergyExpenditure({
      healthCalories: null,
      healthSteps: 9000,
      profile: homme80kg,
      sessionKcal: 250,
    });

    expect(r.breakdown.mode).toBe('estimated');
    expect(r.activitySource).toBe('stepsAndSessions');
    expect(r.activityKcal).toBe(steps + 250);
    expect(r.totalKcal).toBe(BMR + steps + 250);
    expect(r.breakdown.sessionsIncluded).toBe(true);
  });

  it('compte une seance meme sans aucun pas', () => {
    const r = resolveDailyEnergyExpenditure({
      healthCalories: null,
      healthSteps: null,
      profile: homme80kg,
      sessionKcal: 250,
    });

    expect(r.activitySource).toBe('sessions');
    expect(r.totalKcal).toBe(BMR + 250);
  });

  /** Sans seance, le comportement historique est strictement conserve. */
  it('reste identique a l’ancien calcul sans seance', () => {
    const r = resolveDailyEnergyExpenditure({
      healthCalories: null,
      healthSteps: 9000,
      profile: homme80kg,
    });

    expect(r.activitySource).toBe('steps');
    expect(r.activityKcal).toBe(estimateActiveCaloriesFromSteps(9000, 80).activeCaloriesKcal);
  });
});

describe('Repartition de la depense — historique', () => {
  /**
   * Un jour passe sans aucune donnee ne doit pas recevoir une activite devinee
   * qui aurait l'air d'une mesure dans l'historique.
   */
  it('ne devine pas d’activite pour un jour passe sans donnee', () => {
    const r = resolveDailyEnergyExpenditure({
      healthCalories: null,
      healthSteps: null,
      profile: homme80kg,
      allowHabitualEstimate: false,
    });

    expect(r.breakdown.mode).toBe('unknown');
    expect(r.activityKcal).toBeNull();
    expect(r.totalKcal).toBe(BMR);
  });

  it('garde l’estimation habituelle pour le bilan du jour', () => {
    const r = resolveDailyEnergyExpenditure({
      healthCalories: null,
      healthSteps: null,
      profile: homme80kg,
    });

    expect(r.breakdown.mode).toBe('habitual');
    expect(r.breakdown.habitualKcal).toBeGreaterThan(0);
  });
});
