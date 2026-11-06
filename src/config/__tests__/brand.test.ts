import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_NAME } from '../brand';
import { TRANSLATIONS } from '../../i18n/translations';
import { HEALTH_CONNECT_TEXTS_FR } from '../../i18n/healthConnectFallback';

const OLD_NAME = /life\s*sport\s*tracker/i;
const ROOT = join(__dirname, '..', '..', '..');

describe('nom de l’app (Platelift, 1.40.0)', () => {
  it('app.json porte le même nom que APP_NAME, et le texte de la caméra aussi', () => {
    const app = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo;
    expect(app.name).toBe(APP_NAME);
    expect(JSON.stringify(app)).not.toMatch(OLD_NAME);
  });

  it('aucun texte traduit ne garde l’ancien nom, dans les 4 langues', () => {
    for (const [language, table] of Object.entries(TRANSLATIONS)) {
      const stale = Object.entries(table).filter(([, value]) => OLD_NAME.test(String(value)));
      expect({ language, stale }).toEqual({ language, stale: [] });
    }
    expect(JSON.stringify(HEALTH_CONNECT_TEXTS_FR)).not.toMatch(OLD_NAME);
  });

  it('les programmes de la communauté sont signés du nouveau nom', () => {
    const index = readFileSync(join(ROOT, 'community', 'index.json'), 'utf8');
    expect(index).not.toMatch(OLD_NAME);
    expect(index).toContain(`"author": "${APP_NAME}"`);
  });
});
