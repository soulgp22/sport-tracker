import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Regression : le widget restait VIDE sur le launcher (2026-10-20). Le React
 * Compiler injecte un cache memoise (hooks) dans chaque composant, et
 * react-native-android-widget appelle les composants comme des fonctions
 * brutes → « Invalid Hook Call ». La directive de fichier est la seule
 * barriere ; ce test la garde en premiere ligne, avant tout import.
 */
describe('DailyGoalsWidget et React Compiler', () => {
  it('le fichier du widget commence par la directive "use no memo"', () => {
    const source = readFileSync(join(__dirname, '..', 'DailyGoalsWidget.tsx'), 'utf8');
    const firstStatement = source.trimStart().split('\n')[0].trim();

    expect(firstStatement).toBe('"use no memo";');
  });
});
