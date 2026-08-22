import { useProgramStore } from '../programStore';
import { useExerciseCatalogStore } from '../exerciseCatalogStore';
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

/**
 * Régression : un pack téléchargé ne doit JAMAIS écraser un exercice embarqué.
 *
 * Les exercices téléchargés sont persistés dans AsyncStorage. Tant qu'ils
 * gagnaient sur le catalogue livré avec l'app, un utilisateur ayant installé
 * « Plus d'exercices » conservait ses anciennes données à vie : la correction
 * des noms français de la 1.18.0 était réécrite au démarrage par le pack
 * périmé, et mettre à jour l'app n'y changeait rien.
 */
describe('priorité du catalogue embarqué sur les packs téléchargés', () => {
  it("un pack périmé n'écrase pas le nom français embarqué", () => {
    const store = useExerciseCatalogStore.getState();
    const embarque = store.all().find((e) => e.id === 'offline-110');
    expect(embarque?.nameFr).toBe('Sauts latéraux par-dessus cônes');

    // Le pack tel qu'il était AVANT le correctif, avec le nom fautif.
    store.installPack('pack-perime', [
      { ...embarque!, nameFr: 'Élévation latérale aux haltères' },
    ]);

    expect(useExerciseCatalogStore.getState().getById('offline-110')?.nameFr).toBe(
      'Sauts latéraux par-dessus cônes'
    );
  });

  it('un pack peut toujours AJOUTER un exercice absent du catalogue embarqué', () => {
    const store = useExerciseCatalogStore.getState();
    const modele = store.all()[0];
    store.installPack('pack-nouveaute', [
      { ...modele, id: 'pack-only-001', name: 'Pack Only Exercise', nameFr: 'Exercice du pack' },
    ]);

    expect(useExerciseCatalogStore.getState().getById('pack-only-001')?.nameFr).toBe(
      'Exercice du pack'
    );
  });
});
