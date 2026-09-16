/**
 * Garde-fou sur la qualite des instructions francaises du catalogue.
 *
 * Contexte : les 873 fiches ont ete traduites automatiquement, et un defaut
 * lexical systematique a survecu longtemps sans qu'aucun test ne le voie —
 * « banque » pour *bench*, 204 occurrences sur 109 exercices, visible des
 * l'ouverture de n'importe quelle fiche d'exercice. Corrige par
 * `scripts/fix-instructions-fr.mjs`.
 *
 * Ce test empeche la reapparition du defaut, notamment si un pack traduit est
 * regenere ou reimporte.
 */
import catalog from '../exercises.catalog.json';

type Exercise = {
  id: string;
  nameFr?: string;
  instructionsFr?: string[];
};

const exercises = catalog as unknown as Exercise[];

function frenchText(exercise: Exercise): string {
  return (exercise.instructionsFr ?? []).join(' ');
}

describe('instructionsFr — qualite de la traduction', () => {
  it('couvre tout le catalogue', () => {
    expect(exercises.length).toBeGreaterThan(800);
    const missing = exercises.filter((e) => !e.instructionsFr?.length);
    expect(missing).toHaveLength(0);
  });

  /**
   * `banquette` doit etre traque autant que `banque` : c'est le meme defaut
   * sous une autre forme, et une correction naive sans frontiere de mot le
   * transformait en « banctte » — un mot qui n'existe pas.
   */
  it.each([
    ['banque', /\bbanque\b/i],
    ['banques', /\bbanques\b/i],
    ['banquette', /\bbanquettes?\b/i],
    ['banctte', /banctte/i],
  ])('n’emploie jamais « %s » a la place de « banc »', (_label, pattern) => {
    const offenders = exercises
      .filter((e) => pattern.test(frenchText(e)))
      .map((e) => `${e.id} (${e.nameFr})`);

    expect(offenders).toEqual([]);
  });

  it('ne laisse aucune phrase en anglais', () => {
    // Marqueurs sans ambiguite : ces suites n'existent pas en francais.
    const englishMarkers = [
      /\bthis will be your\b/i,
      /\bstarting position\b/i,
      /\bmake sure\b/i,
      /\brepeat for\b/i,
      /\bkneel in front\b/i,
    ];

    const offenders = exercises
      .filter((e) => englishMarkers.some((re) => re.test(frenchText(e))))
      .map((e) => `${e.id} (${e.nameFr})`);

    expect(offenders).toEqual([]);
  });

  it('accorde au masculin les adjectifs qui suivent « banc »', () => {
    // Le genre change en corrigeant banque -> banc : les accords doivent suivre.
    const badAgreement = /\bbanc\s+(plate|inclinée|déclinée|abdominale|verticale)\b/i;
    const offenders = exercises
      .filter((e) => badAgreement.test(frenchText(e)))
      .map((e) => `${e.id} (${e.nameFr})`);

    expect(offenders).toEqual([]);
  });
});
