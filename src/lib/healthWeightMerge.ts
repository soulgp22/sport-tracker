/**
 * Regle de fusion entre le poids lu dans Health Connect et les pesees saisies.
 *
 * Module SANS dependance a Health Connect ni a l'UI : il ne fait que decider,
 * a partir de donnees deja lues, ce qu'il faut ecrire. Cela le rend testable
 * sans appareil, sans permission et sans module natif.
 *
 * Regle retenue : **le releve le plus recent gagne**, jour par jour.
 * - aucun releve pour ce jour  -> on ajoute ;
 * - un releve existe, plus recent -> on ne touche a rien ;
 * - un releve existe, plus ancien -> on le remplace, en conservant son id.
 *
 * Consequence voulue : si Health Connect n'a rien, la saisie manuelle reste
 * seule et s'affiche — c'est le repli demande. Et si le dernier poids Health
 * Connect date de trois semaines alors qu'une pesee a ete saisie hier, la
 * pesee d'hier reste la plus recente de l'historique, donc celle qui s'affiche.
 * Aucune regle de priorite supplementaire n'est necessaire a l'affichage.
 */
import type { WeightEntry } from '../types';

/** Un releve de poids a fusionner, quelle que soit sa provenance. */
export interface HealthWeightSample {
  weightKg: number;
  /** Horodatage ISO du releve. */
  time: string;
}

export type HealthWeightMergeDecision =
  | { action: 'add'; date: string; weight: number }
  | { action: 'replace'; id: string; date: string; weight: number }
  | { action: 'skip'; reason: 'sameDayIsFresher' | 'alreadyStored' };

function dayKey(isoDate: string): string {
  return isoDate.slice(0, 10);
}

/**
 * Decide quoi faire d'un releve Health Connect face aux pesees existantes.
 *
 * @param entries pesees telles que stockees (l'ordre n'a pas d'importance)
 * @param sample dernier releve Health Connect
 */
export function resolveHealthWeightMerge(
  entries: WeightEntry[],
  sample: HealthWeightSample
): HealthWeightMergeDecision {
  const sameDay = entries.find((entry) => dayKey(entry.date) === dayKey(sample.time));

  if (!sameDay) {
    return { action: 'add', date: sample.time, weight: sample.weightKg };
  }

  // Re-synchronisation du meme releve : ne rien reecrire, sinon chaque retour
  // sur l'ecran produirait une ecriture de stockage identique.
  if (sameDay.date === sample.time && sameDay.weight === sample.weightKg) {
    return { action: 'skip', reason: 'alreadyStored' };
  }

  // `>=` et non `>` : a horodatage egal on garde ce qui est deja en place.
  if (sameDay.date >= sample.time) {
    return { action: 'skip', reason: 'sameDayIsFresher' };
  }

  return {
    action: 'replace',
    id: sameDay.id,
    date: sample.time,
    weight: sample.weightKg,
  };
}
