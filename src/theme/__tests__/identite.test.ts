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
      bg: '#f5f1e6',
      surface: '#ebe5d4',
      surfaceAlt: '#e6e1d3',
      border: '#d5cfbe',
      textPrimary: '#16233b',
      textSecondary: '#4a4c50',
      textMuted: '#8d897c',
      primary: '#16233b',
      primaryText: '#f5f1e6',
      secondary: '#0e7a58',
      success: '#0e7a58',
      danger: '#ec3013',
      accentSoft: 'rgba(22,35,59,0.10)',
      overlay: 'rgba(14,23,39,0.50)',
    });
  });

  it('T2 : tous les rayons valent 0', () => {
    expect(radius).toEqual({ sm: 0, md: 0, lg: 0, xl: 0, pill: 0 });
  });

  it('T3 : aucun jeton ne référence OstrichSans-Black et chaque jeton est non vide', () => {
    const tokens = Object.values(FONT_THEMES.lst.tokens);
    for (const value of tokens) {
      expect(value).not.toBe('');
      expect(value).not.toContain('OstrichSans-Black');
    }
  });
});
