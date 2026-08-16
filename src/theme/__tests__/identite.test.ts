import { DEFAULT_PALETTE, PALETTES } from '../palettes';
import { FONT_THEMES } from '../fonts';
import { radius } from '../tokens';

describe('identité visuelle unique « Life Sport Tracker »', () => {
  it('T1 : PALETTES ne contient qu’une palette « lst » aux couleurs exactes', () => {
    const ids = Object.keys(PALETTES);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe('lst');
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
      success: '#10a06a',
      danger: '#ef3d2a',
      accentSoft: 'rgba(31,95,224,0.10)',
      overlay: 'rgba(14,23,39,0.50)',
    });
  });

  it('T2 : échelle de rayons arrondie (sm 8, md 12, lg 16, xl 24, pill 999)', () => {
    expect(radius).toEqual({ sm: 8, md: 12, lg: 16, xl: 24, pill: 999 });
  });

  it('T3 : aucun jeton ne référence OstrichSans-Black et chaque jeton est non vide', () => {
    const tokens = Object.values(FONT_THEMES.lst.tokens);
    for (const value of tokens) {
      expect(value).not.toBe('');
      expect(value).not.toContain('OstrichSans-Black');
    }
  });
});
