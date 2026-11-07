import { TRANSLATIONS } from '../../i18n/translations';
import { FONT_FILES } from '../fontFiles';
import { FONT_THEMES, type FontId } from '../fonts';
import { DEFAULT_PALETTE, PALETTES, type PaletteId } from '../palettes';
import { radius } from '../tokens';

/** Rapport de contraste WCAG 2.x entre deux couleurs #rrggbb. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('identité visuelle « Platelift » et personnalisation', () => {
  it('T1 : la palette par défaut reste « lst » aux couleurs exactes', () => {
    expect(DEFAULT_PALETTE).toBe('lst');
    expect(PALETTES.lst.colors).toEqual({
      bg: '#fbfbfa',
      surface: '#ffffff',
      surfaceAlt: '#f2f4f7',
      border: '#e4e6ea',
      textPrimary: '#16233b',
      textSecondary: '#55606f',
      textMuted: '#8a94a3',
      primary: '#16233b',
      primaryText: '#ffffff',
      secondary: '#1f5fe0',
      tertiary: '#047857',
      success: '#047857',
      danger: '#ef3d2a',
      accentSoft: 'rgba(31,95,224,0.10)',
      overlay: 'rgba(14,23,39,0.50)',
    });
  });

  it('T2 : échelle de rayons arrondie (sm 8, md 12, lg 16, xl 24, pill 999)', () => {
    expect(radius).toEqual({ sm: 8, md: 12, lg: 16, xl: 24, pill: 999 });
  });

  it('T3 : chaque jeton de police est chargé par FONT_FILES et aucun ne vise OstrichSans-Black', () => {
    for (const id of Object.keys(FONT_THEMES) as FontId[]) {
      for (const family of Object.values(FONT_THEMES[id].tokens)) {
        expect(family).not.toContain('OstrichSans-Black');
        // Une famille absente du chargement s'afficherait en police système, sans erreur.
        expect(Object.keys(FONT_FILES)).toContain(family);
      }
    }
  });

  it.each(Object.keys(PALETTES) as PaletteId[])(
    'T4 : la palette « %s » respecte les seuils de contraste de « lst »',
    (id) => {
      const c = PALETTES[id].colors;
      // Texte courant et secondaire : 4,5 (WCAG AA) sur fond et cartes.
      expect(contrast(c.textPrimary, c.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.textSecondary, c.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.textSecondary, c.surfaceAlt)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.primaryText, c.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.primary, c.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.secondary, c.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.tertiary, c.surface)).toBeGreaterThanOrEqual(4.5);
      // Texte estompé et rouge d'alerte : seuils de « lst » (3,1 et 3,9).
      expect(contrast(c.textMuted, c.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(c.danger, c.surface)).toBeGreaterThanOrEqual(3.5);
    }
  );

  it('T5 : chaque nom de palette et de police est traduit dans les 4 langues', () => {
    const keys = [
      ...Object.values(PALETTES).map((p) => p.labelKey),
      ...Object.values(FONT_THEMES).flatMap((f) => [f.labelKey, f.descriptionKey]),
    ];
    for (const table of Object.values(TRANSLATIONS)) {
      for (const key of keys) {
        expect(table[key]).toEqual(expect.any(String));
      }
    }
  });
});
