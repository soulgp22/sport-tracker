const { spawnSync } = require('node:child_process');
const path = require('node:path');

/**
 * Garde-fou permanent sur les noms d'exercices (voir known_bugs.md).
 *
 * Le validateur ne fait echouer que sur ses regles BLOQUANTES (R1 unicite,
 * R2 materiel, R4 non vide) : elles sont objectives et sans faux positif.
 *
 * R3 (coherence de mouvement EN <-> FR) reste un AVERTISSEMENT affiche dans le
 * rapport mais ne casse pas la suite : les noms anglais emploient des
 * formulations variees qui designent pourtant le bon mouvement — « Floor Press »
 * et « Board Press » sont des developpes couches, « Front Delt Raise » une
 * elevation frontale. En faire une regle bloquante forcerait le repli en anglais
 * sur ~150 traductions correctes, ce qui serait pire que le defaut corrige.
 */
describe('exercise names catalog validation', () => {
  it('ne laisse passer aucune violation bloquante (R1 unicite / R2 materiel / R4 vide)', () => {
    const result = spawnSync(process.execPath, ['scripts/validate-exercise-names.mjs'], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
    });

    // Le rapport complet part sur stderr : on l'affiche en cas d'echec pour
    // pouvoir identifier les exercices fautifs sans relancer le script.
    expect({ status: result.status, rapport: result.stderr }).toEqual({
      status: 0,
      rapport: result.stderr,
    });
    expect(result.status).toBe(0);
  });
});
