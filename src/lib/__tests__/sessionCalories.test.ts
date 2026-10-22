import {
  DEFAULT_BODYWEIGHT_KG,
  MAX_MINUTES_PER_SET,
  MET_BASE,
  MET_VIGOROUS,
  estimateSessionCalories,
} from '../sessionCalories';
import type { LoggedSet, SessionExercise } from '../../types';

function set(reps: number, weight: number, completed = true): LoggedSet {
  return {
    targetReps: reps,
    targetWeight: weight,
    targetRestSeconds: 90,
    actualReps: reps,
    actualWeight: weight,
    completed,
  };
}

function exercise(sets: LoggedSet[]): SessionExercise {
  return { exerciseId: 'x', exerciseName: 'X', sets };
}

describe('estimateSessionCalories', () => {
  it('ne produit rien sans serie terminee', () => {
    const session = { durationSeconds: 3600, exercises: [exercise([set(10, 80, false)])] };
    expect(estimateSessionCalories(session, 80)).toBeNull();
  });

  /**
   * Ordre de grandeur de reference : la litterature mesure 200 a 400 kcal par
   * heure de musculation. Une formule qui sort de cette plage sur des seances
   * typiques est fausse, quelle que soit son elegance.
   */
  it('reste dans la plage mesuree pour une seance typique d’une heure', () => {
    const session = {
      durationSeconds: 3600,
      exercises: [exercise(Array.from({ length: 16 }, () => set(10, 50)))],
    };
    const estimate = estimateSessionCalories(session, 80)!;
    expect(estimate.kcal).toBeGreaterThanOrEqual(200);
    expect(estimate.kcal).toBeLessThanOrEqual(450);
  });

  it('attribue plus d’energie a une seance lourde qu’a une seance legere de meme duree', () => {
    const light = {
      durationSeconds: 3600,
      exercises: [exercise(Array.from({ length: 12 }, () => set(12, 20)))],
    };
    const heavy = {
      durationSeconds: 3600,
      exercises: [exercise(Array.from({ length: 20 }, () => set(10, 80)))],
    };
    const l = estimateSessionCalories(light, 80)!;
    const h = estimateSessionCalories(heavy, 80)!;
    expect(h.kcal).toBeGreaterThan(l.kcal);
    expect(h.met).toBeGreaterThan(l.met);
  });

  it('borne le MET entre la base et l’effort vigoureux', () => {
    const extreme = {
      durationSeconds: 600,
      exercises: [exercise(Array.from({ length: 30 }, () => set(20, 300)))],
    };
    const empty = {
      durationSeconds: 3600,
      exercises: [exercise([set(1, 1)])],
    };
    expect(estimateSessionCalories(extreme, 80)!.met).toBe(MET_VIGOROUS);
    expect(estimateSessionCalories(empty, 80)!.met).toBe(MET_BASE);
  });

  /**
   * Garde-fou : une seance oubliee ouverte cinq heures ne doit pas afficher une
   * depense aberrante. La duree est plafonnee par le nombre de series.
   */
  it('plafonne la duree d’une seance oubliee ouverte', () => {
    const forgotten = {
      durationSeconds: 5 * 3600,
      exercises: [exercise(Array.from({ length: 5 }, () => set(10, 50)))],
    };
    const estimate = estimateSessionCalories(forgotten, 80)!;
    expect(estimate.minutes).toBe(5 * MAX_MINUTES_PER_SET);
    expect(estimate.kcal).toBeLessThan(200);
  });

  it('estime une duree quand la seance n’en a pas', () => {
    const session = { durationSeconds: 0, exercises: [exercise([set(10, 50), set(10, 50)])] };
    const estimate = estimateSessionCalories(session, 80)!;
    expect(estimate.minutes).toBeGreaterThan(0);
    expect(estimate.kcal).toBeGreaterThan(0);
  });

  it('compte une fraction du poids de corps pour les exercices sans charge', () => {
    const bodyweight = { durationSeconds: 1800, exercises: [exercise([set(10, 0)])] };
    expect(estimateSessionCalories(bodyweight, 80)!.volumeLoadKg).toBe(400);
  });

  it('se rabat sur 70 kg et le signale quand le poids est inconnu', () => {
    const session = { durationSeconds: 1800, exercises: [exercise([set(10, 40)])] };
    const estimate = estimateSessionCalories(session)!;
    expect(estimate.usedDefaultWeight).toBe(true);
    expect(estimateSessionCalories(session, DEFAULT_BODYWEIGHT_KG)!.kcal).toBe(estimate.kcal);
  });

  it('arrondit a 5 kcal et encadre la valeur d’une fourchette', () => {
    const session = {
      durationSeconds: 2700,
      exercises: [exercise(Array.from({ length: 10 }, () => set(10, 60)))],
    };
    const estimate = estimateSessionCalories(session, 75)!;
    expect(estimate.kcal % 5).toBe(0);
    expect(estimate.minKcal).toBeLessThan(estimate.kcal);
    expect(estimate.maxKcal).toBeGreaterThan(estimate.kcal);
  });

  /**
   * Depense NETTE : le metabolisme de repos est deja compte a part dans la
   * depense du corps. Une estimation brute le compterait deux fois.
   */
  it('retire le metabolisme de repos (depense nette, pas brute)', () => {
    // 15 series : le plafond (15 x 4 min = 60 min) ne raccourcit pas l'heure,
    // et la charge quasi nulle laisse le MET a sa valeur de base.
    const session = {
      durationSeconds: 3600,
      exercises: [exercise(Array.from({ length: 15 }, () => set(1, 1)))],
    };
    const estimate = estimateSessionCalories(session, 80)!;
    const gross = MET_BASE * 3.5 * (80 / 200) * 60;
    const net = (MET_BASE - 1) * 3.5 * (80 / 200) * 60;
    expect(estimate.kcal).toBe(Math.round(net / 5) * 5);
    expect(estimate.kcal).toBeLessThan(gross);
  });
});
