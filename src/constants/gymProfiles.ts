import type { CatalogExercise } from '../types';

export type GymProfileId =
  | 'all'
  | 'fitness-park'
  | 'basic-fit'
  | 'on-air'
  | 'planet-fitness'
  | 'la-fitness'
  | 'golds-gym';

type GymCapability =
  | 'cardio'
  | 'freeWeights'
  | 'machines'
  | 'functional'
  | 'olympic'
  | 'strongman';

export interface GymProfile {
  id: GymProfileId;
  name: string;
  country: 'FR' | 'US' | 'ALL';
  capabilities: GymCapability[];
  sourceUrl?: string;
}

export const GYM_PROFILES: GymProfile[] = [
  {
    id: 'all',
    name: 'Toutes les salles',
    country: 'ALL',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional', 'olympic', 'strongman'],
  },
  {
    id: 'fitness-park',
    name: 'Fitness Park',
    country: 'FR',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional', 'olympic', 'strongman'],
    sourceUrl: 'https://www.fitnesspark.fr/activites/musculation/',
  },
  {
    id: 'basic-fit',
    name: 'Basic-Fit',
    country: 'FR',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional'],
    sourceUrl: 'https://www.basic-fit.com/fr-fr/trainingzones',
  },
  {
    id: 'on-air',
    name: 'ON AIR Fitness',
    country: 'FR',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional', 'olympic'],
    sourceUrl: 'https://onair-fitness.fr/abonnements/',
  },
  {
    id: 'planet-fitness',
    name: 'Planet Fitness',
    country: 'US',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional'],
    sourceUrl: 'https://www.planetfitness.com/our-clubs',
  },
  {
    id: 'la-fitness',
    name: 'LA Fitness',
    country: 'US',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional', 'olympic'],
    sourceUrl: 'https://www.lafitness.com/',
  },
  {
    id: 'golds-gym',
    name: "Gold's Gym",
    country: 'US',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional', 'olympic', 'strongman'],
    sourceUrl: 'https://www.goldsgym.com/',
  },
];

const OLYMPIC_TERMS =
  /\b(clean|snatch|jerk|olympic|hang power|power clean|split jerk|push jerk)\b/i;
const STRONGMAN_TERMS =
  /\b(sled|sledgehammer|tire|farmer|atlas stone|yoke|log lift|prowler|truck pull)\b/i;
const CARDIO_TERMS =
  /\b(run|running|walk|walking|cycle|cycling|bike|bicycl|elliptical|rowing|stair|stepmill|cardio|jog|rope jumping)\b/i;

function getRequirements(exercise: CatalogExercise): GymCapability[] {
  const requirements = new Set<GymCapability>();
  const searchableName = `${exercise.name} ${exercise.nameFr ?? ''}`;

  if (['barbell', 'dumbbell', 'e-z curl bar'].includes(exercise.equipment)) {
    requirements.add('freeWeights');
  }
  if (['machine', 'cable'].includes(exercise.equipment)) {
    requirements.add('machines');
  }
  if (
    ['bands', 'exercise ball', 'foam roll', 'kettlebells', 'medicine ball'].includes(
      exercise.equipment
    )
  ) {
    requirements.add('functional');
  }
  if (OLYMPIC_TERMS.test(searchableName)) requirements.add('olympic');
  if (STRONGMAN_TERMS.test(searchableName)) requirements.add('strongman');
  if (CARDIO_TERMS.test(searchableName)) requirements.add('cardio');

  return [...requirements];
}

export function getGymProfile(id: GymProfileId) {
  return GYM_PROFILES.find((profile) => profile.id === id) ?? GYM_PROFILES[0];
}

export function isExerciseAvailableAtGym(exercise: CatalogExercise, gymId: GymProfileId) {
  if (gymId === 'all' || exercise.equipment === 'body only') return true;
  const capabilities = new Set(getGymProfile(gymId).capabilities);
  return getRequirements(exercise).every((requirement) => capabilities.has(requirement));
}

export function getGymFlag(country: GymProfile['country']) {
  if (country === 'FR') return '🇫🇷';
  if (country === 'US') return '🇺🇸';
  return '🌍';
}
