import type { CommunityManifest, CommunityProgramEntry } from '../store/communityStore';
import type { OnboardingProfile } from '../store/onboardingStore';

/**
 * Sélection du programme recommandé selon le profil d'onboarding.
 *
 * Le manifeste communautaire contient un programme par combinaison
 * équipement (6) × objectif (4) × niveau (3), avec l'id conventionné
 * `<equipmentProfileId>-<goal>-<level>` (générés par
 * `scripts/generate-community-programs.py`).
 *
 * Le nombre de séances par semaine choisi ne change pas le programme :
 * chaque programme est un cycle (3, 4 ou 5 séances selon le niveau) que
 * l'utilisateur étale sur son rythme hebdomadaire.
 */
export function recommendedProgramId(profile: OnboardingProfile): string {
  return `${profile.equipmentProfileId}-${profile.goal}-${profile.level}`;
}

/**
 * Trouve l'entrée du manifeste correspondant au profil, avec replis :
 * 1. combinaison exacte équipement × objectif × niveau ;
 * 2. même équipement et niveau, objectif « fitness » (programme généraliste) ;
 * 3. anciens programmes génériques (manifeste antérieur à la matrice) ;
 * 4. undefined si rien ne correspond (le téléchargement est alors ignoré).
 */
export function findRecommendedProgram(
  manifest: CommunityManifest,
  profile: OnboardingProfile,
): CommunityProgramEntry | undefined {
  const exactId = recommendedProgramId(profile);
  const fitnessFallbackId = `${profile.equipmentProfileId}-fitness-${profile.level}`;
  const legacyIds = profile.level === 'beginner' || profile.goal === 'weight_loss'
    ? ['full-body-3']
    : profile.daysPerWeek >= 4
      ? ['upper-lower-4']
      : ['ppl-3'];

  const candidates = [exactId, fitnessFallbackId, ...legacyIds];
  for (const id of candidates) {
    const entry = manifest.programs.find((program) => program.id === id);
    if (entry) return entry;
  }
  return undefined;
}
