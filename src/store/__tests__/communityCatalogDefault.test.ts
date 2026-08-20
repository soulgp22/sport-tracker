import { useProgramStore } from '../programStore';
import realProgram from '../../../community/bodyweight-fitness-beginner.json';

/**
 * Régression : les 90 programmes du catalogue communautaire (community/*.json)
 * référencent des exercices par nom, contre le catalogue par défaut de l'app —
 * SANS téléchargement préalable du pack d'exercices. Avant le passage au
 * catalogue complet (exercises.catalog.json), le catalogue par défaut ne
 * contenait que 22 exercices : 80 % des exercices communautaires (100 % pour
 * les programmes "bodyweight-*") ne se résolvaient pas et les jours importés
 * arrivaient vides. Voir known_bugs.md.
 *
 * Ce test importe un vrai fichier du dossier community/ tel quel, sans
 * installer aucun pack au préalable, pour prouver que le catalogue par défaut
 * de l'app suffit à résoudre tous ses exercices.
 */
describe('import d\'un programme communautaire réel, catalogue par défaut', () => {
  beforeEach(() => {
    useProgramStore.setState({ programs: [] });
  });

  it("résout tous les exercices de bodyweight-fitness-beginner.json sans pack téléchargé", () => {
    const result = useProgramStore.getState().importPrograms(JSON.stringify(realProgram));

    expect(result.unknownExercises).toEqual([]);
    expect(result.skipped).toBe(0);
    expect(result.importedPrograms).toBe(1);

    const days = useProgramStore.getState().programs[0].days;
    expect(days.length).toBeGreaterThan(0);
    for (const day of days) {
      expect(day.exercises.length).toBeGreaterThan(0);
    }
  });
});
