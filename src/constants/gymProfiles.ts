import type { CatalogExercise } from '../types';
import type { GymProfileId } from '../types/gym';

export type GymCapability =
  | 'cardio'
  | 'freeWeights'
  | 'machines'
  | 'functional'
  | 'olympic'
  | 'strongman';

export interface GymProfile {
  id: GymProfileId;
  name: string;
  shortName: string;
  country: 'FR' | 'US' | 'ALL';
  iconText: string;
  brandColor: string;
  brandTextColor: string;
  capabilities: GymCapability[];
  sourceUrl?: string;
}

export const GYM_PROFILES: GymProfile[] = [
  {
    id: 'all',
    name: 'Sans salle définie',
    shortName: 'Libre',
    country: 'ALL',
    iconText: '∞',
    brandColor: '#334155',
    brandTextColor: '#FFFFFF',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional', 'olympic', 'strongman'],
  },
  {
    id: 'fitness-park',
    name: 'Fitness Park',
    shortName: 'Fitness Park',
    country: 'FR',
    iconText: 'FP',
    brandColor: '#E30613',
    brandTextColor: '#FFFFFF',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional', 'olympic', 'strongman'],
    sourceUrl: 'https://www.fitnesspark.fr/activites/musculation/',
  },
  {
    id: 'basic-fit',
    name: 'Basic-Fit',
    shortName: 'Basic-Fit',
    country: 'FR',
    iconText: 'BF',
    brandColor: '#F36F21',
    brandTextColor: '#FFFFFF',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional'],
    sourceUrl: 'https://www.basic-fit.com/fr-fr/trainingzones',
  },
  {
    id: 'on-air',
    name: 'ON AIR Fitness',
    shortName: 'ON AIR',
    country: 'FR',
    iconText: 'OA',
    brandColor: '#E51B23',
    brandTextColor: '#FFFFFF',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional', 'olympic'],
    sourceUrl: 'https://onair-fitness.fr/abonnements/',
  },
  {
    id: 'planet-fitness',
    name: 'Planet Fitness',
    shortName: 'Planet',
    country: 'US',
    iconText: 'PF',
    brandColor: '#5B2C83',
    brandTextColor: '#F9D648',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional'],
    sourceUrl: 'https://www.planetfitness.com/our-clubs',
  },
  {
    id: 'la-fitness',
    name: 'LA Fitness',
    shortName: 'LA Fitness',
    country: 'US',
    iconText: 'LA',
    brandColor: '#1F4F9A',
    brandTextColor: '#FFFFFF',
    capabilities: ['cardio', 'freeWeights', 'machines', 'functional', 'olympic'],
    sourceUrl: 'https://www.lafitness.com/',
  },
  {
    id: 'golds-gym',
    name: "Gold's Gym",
    shortName: "Gold's",
    country: 'US',
    iconText: 'GG',
    brandColor: '#F3C623',
    brandTextColor: '#111827',
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

export function getExerciseRequirements(exercise: CatalogExercise): GymCapability[] {
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

export function getGymProfile(id: GymProfileId | null | undefined) {
  return GYM_PROFILES.find((profile) => profile.id === id) ?? GYM_PROFILES[0];
}

export function isExerciseAvailableAtGym(
  exercise: CatalogExercise,
  gymId: GymProfileId | null | undefined
) {
  if (!gymId || gymId === 'all' || exercise.equipment === 'body only') return true;
  const capabilities = new Set(getGymProfile(gymId).capabilities);
  return getExerciseRequirements(exercise).every((requirement) => capabilities.has(requirement));
}
