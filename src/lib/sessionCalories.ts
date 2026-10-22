/**
 * Estimation de la depense calorique d'une seance de musculation.
 *
 * METHODE — equivalents metaboliques (METs, Compendium of Physical Activities),
 * modules par la charge de travail reellement soulevee :
 *
 *   1. MET de base 3,5 (musculation, plusieurs exercices, 8-15 reps) ; plafond
 *      6,0 (effort vigoureux). References du Compendium, a traiter comme des
 *      ordres de grandeur, pas comme des constantes physiques.
 *   2. L'intensite est deduite de la DENSITE de travail :
 *        densite = charge totale (kg) / (poids de corps x minutes)
 *      et fait glisser le MET lineairement de 3,5 a 6,0.
 *   3. Depense NETTE :
 *        kcal = (MET - 1) x 3,5 x poids / 200 x minutes
 *      « - 1 » retire le metabolisme de repos de la periode : il est deja compte
 *      a part dans la depense du corps. Sans ce retrait, il serait compte deux
 *      fois des qu'on additionne corps + seance.
 *
 * POURQUOI PAS AUTRE CHOSE (analyse du 2026-08-29) :
 *   - Keytel (age, sexe, frequence cardiaque) : pas de FC disponible, et validee
 *     sur l'effort aerobie continu. En musculation la FC monte sans consommation
 *     d'oxygene proportionnelle : elle surestime.
 *   - Travail mecanique pur (m x g x h) : mesure le travail EXTERNE, pas le cout
 *     metabolique ; sous-estime d'un facteur ~3. Il sert ici de modulateur, via
 *     la charge, jamais de mesure autonome.
 *   - Age et sexe ne sont PAS utilises : le MET est deja normalise par kilo, et
 *     aucune formule validee en musculation ne les exploite sans FC.
 *
 * PRECISION — les estimations grand public en musculation se trompent
 * couramment de 25 a 50 %. Le resultat est donc arrondi a 5 kcal et accompagne
 * d'une fourchette : afficher « 247 kcal » suggererait une precision qui
 * n'existe pas.
 *
 * Module PUR : aucune dependance au stockage ni a l'UI.
 */
import type { Session } from '../types';

/** Compendium 02050 : musculation, plusieurs exercices, 8-15 repetitions. */
export const MET_BASE = 3.5;
/** Compendium 02052 : musculation, effort vigoureux. */
export const MET_VIGOROUS = 6.0;

/**
 * Densite (kg souleves par kg de poids de corps et par minute) a partir de
 * laquelle la seance est traitee comme vigoureuse.
 *
 * HYPOTHESE DE CALIBRATION, pas une constante publiee : une seance lourde
 * (20 series x 10 reps a 80 kg, 60 min, 80 kg de poids de corps) donne ~3,3 ;
 * une seance legere (12 x 12 a 20 kg) donne ~0,6. Le seuil de 3 place ces deux
 * cas aux extremites de l'echelle MET.
 */
export const DENSITY_AT_VIGOROUS = 3;

/**
 * Fraction du poids de corps retenue pour un exercice au poids du corps
 * (charge saisie = 0). Hypothese : pompes, tractions et dips deplacent entre la
 * moitie et la quasi-totalite du poids de corps ; 0,5 reste prudent.
 */
export const BODYWEIGHT_LOAD_FRACTION = 0.5;

/** Duree retenue par serie quand la seance n'a pas de duree exploitable. */
export const DEFAULT_MINUTES_PER_SET = 2.5;
/**
 * Plafond de duree par serie. Garde-fou : une seance oubliee ouverte pendant
 * cinq heures ne doit pas afficher 2 000 kcal.
 */
export const MAX_MINUTES_PER_SET = 4;

/** Poids de repli, identique a l'estimation par les pas. */
export const DEFAULT_BODYWEIGHT_KG = 70;

/** Marge d'erreur affichee autour de la valeur centrale. */
export const ESTIMATE_MARGIN = 0.25;

export interface SessionCaloriesEstimate {
  /** Valeur centrale, arrondie a 5 kcal. */
  kcal: number;
  /** Bornes de la fourchette, arrondies a 5 kcal. */
  minKcal: number;
  maxKcal: number;
  /** MET retenu apres modulation par la charge. */
  met: number;
  /** Duree retenue apres garde-fous, en minutes. */
  minutes: number;
  /** Charge totale soulevee sur les series terminees, en kg. */
  volumeLoadKg: number;
  completedSets: number;
  usedDefaultWeight: boolean;
}

const roundTo5 = (value: number) => Math.round(value / 5) * 5;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Estime la depense NETTE d'une seance. Retourne null si aucune serie n'a ete
 * terminee : sans travail effectue, il n'y a rien a estimer.
 */
export function estimateSessionCalories(
  session: Pick<Session, 'durationSeconds' | 'exercises'>,
  bodyweightKg?: number
): SessionCaloriesEstimate | null {
  const validWeight =
    bodyweightKg !== undefined && Number.isFinite(bodyweightKg) && bodyweightKg > 0;
  const weightKg = validWeight ? bodyweightKg : DEFAULT_BODYWEIGHT_KG;

  const completed = session.exercises.flatMap((exercise) =>
    exercise.sets.filter((set) => set.completed && set.actualReps > 0)
  );
  if (completed.length === 0) return null;

  const volumeLoadKg = completed.reduce((sum, set) => {
    const load =
      Number.isFinite(set.actualWeight) && set.actualWeight > 0
        ? set.actualWeight
        : weightKg * BODYWEIGHT_LOAD_FRACTION;
    return sum + set.actualReps * load;
  }, 0);

  const rawMinutes = Number.isFinite(session.durationSeconds) ? session.durationSeconds / 60 : 0;
  const cap = completed.length * MAX_MINUTES_PER_SET;
  const minutes =
    rawMinutes > 0
      ? Math.min(rawMinutes, cap)
      : completed.length * DEFAULT_MINUTES_PER_SET;

  const density = volumeLoadKg / (weightKg * minutes);
  const met = clamp(
    MET_BASE + (MET_VIGOROUS - MET_BASE) * (density / DENSITY_AT_VIGOROUS),
    MET_BASE,
    MET_VIGOROUS
  );

  const netKcal = (met - 1) * 3.5 * (weightKg / 200) * minutes;

  return {
    kcal: roundTo5(netKcal),
    minKcal: roundTo5(netKcal * (1 - ESTIMATE_MARGIN)),
    maxKcal: roundTo5(netKcal * (1 + ESTIMATE_MARGIN)),
    met: Math.round(met * 100) / 100,
    minutes: Math.round(minutes),
    volumeLoadKg: Math.round(volumeLoadKg),
    completedSets: completed.length,
    usedDefaultWeight: !validWeight,
  };
}
