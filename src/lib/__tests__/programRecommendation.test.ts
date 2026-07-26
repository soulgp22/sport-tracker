import { findRecommendedProgram, recommendedProgramId } from '../programRecommendation';
import type { CommunityManifest, CommunityProgramEntry } from '../../store/communityStore';
import type {
  OnboardingGoal,
  OnboardingLevel,
  OnboardingProfile,
} from '../../store/onboardingStore';

const GOALS: OnboardingGoal[] = ['muscle', 'strength', 'weight_loss', 'fitness'];
const LEVELS: OnboardingLevel[] = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT = ['bodyweight', 'home-basic', 'dumbbells', 'machines', 'barbell', 'full-gym'] as const;

const baseProfile: OnboardingProfile = {
  goal: 'muscle',
  level: 'intermediate',
  daysPerWeek: 4,
  equipmentProfileId: 'dumbbells',
  retailer: 'none',
};

function entry(id: string): CommunityProgramEntry {
  return { id, name: id, description: '', author: '', level: 'beginner', daysCount: 3, file: `${id}.json` };
}

function manifestWith(ids: string[]): CommunityManifest {
  return { version: 3, programs: ids.map(entry), foodDatabases: [] };
}

describe('recommendedProgramId', () => {
  it('construit l’id <équipement>-<objectif>-<niveau>', () => {
    expect(recommendedProgramId(baseProfile)).toBe('dumbbells-muscle-intermediate');
    expect(recommendedProgramId({ ...baseProfile, goal: 'weight_loss', level: 'advanced', equipmentProfileId: 'bodyweight' }))
      .toBe('bodyweight-weight_loss-advanced');
  });
});

describe('findRecommendedProgram', () => {
  it('trouve la combinaison exacte pour toute la matrice équipement × objectif × niveau', () => {
    const ids: string[] = [];
    for (const equipment of EQUIPMENT) {
      for (const goal of GOALS) {
        for (const level of LEVELS) {
          ids.push(`${equipment}-${goal}-${level}`);
        }
      }
    }
    const manifest = manifestWith(ids);
    for (const equipment of EQUIPMENT) {
      for (const goal of GOALS) {
        for (const level of LEVELS) {
          const profile: OnboardingProfile = { ...baseProfile, equipmentProfileId: equipment, goal, level };
          expect(findRecommendedProgram(manifest, profile)?.id).toBe(`${equipment}-${goal}-${level}`);
        }
      }
    }
  });

  it('rejoue le même programme quel que soit le nombre de séances par semaine', () => {
    const manifest = manifestWith(['dumbbells-muscle-intermediate']);
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      expect(findRecommendedProgram(manifest, { ...baseProfile, daysPerWeek })?.id)
        .toBe('dumbbells-muscle-intermediate');
    }
  });

  it('retombe sur l’objectif fitness si la combinaison exacte est absente', () => {
    const manifest = manifestWith(['dumbbells-fitness-intermediate']);
    expect(findRecommendedProgram(manifest, baseProfile)?.id).toBe('dumbbells-fitness-intermediate');
  });

  it('retombe sur full-body-3 pour un débutant avec un ancien manifeste', () => {
    const manifest = manifestWith(['full-body-3', 'ppl-3', 'upper-lower-4']);
    expect(findRecommendedProgram(manifest, { ...baseProfile, level: 'beginner' })?.id).toBe('full-body-3');
    expect(findRecommendedProgram(manifest, { ...baseProfile, goal: 'weight_loss', level: 'advanced' })?.id)
      .toBe('full-body-3');
  });

  it('retombe sur upper-lower-4 ou ppl-3 selon le rythme avec un ancien manifeste', () => {
    const manifest = manifestWith(['full-body-3', 'ppl-3', 'upper-lower-4']);
    expect(findRecommendedProgram(manifest, { ...baseProfile, daysPerWeek: 4 })?.id).toBe('upper-lower-4');
    expect(findRecommendedProgram(manifest, { ...baseProfile, daysPerWeek: 3 })?.id).toBe('ppl-3');
  });

  it('retourne undefined si rien ne correspond', () => {
    expect(findRecommendedProgram(manifestWith([]), baseProfile)).toBeUndefined();
    expect(findRecommendedProgram(manifestWith(['full-body-3']), { ...baseProfile, goal: 'strength', level: 'advanced' }))
      .toBeUndefined();
  });
});
