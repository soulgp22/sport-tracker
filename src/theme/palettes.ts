/**
 * Couleurs de l'identité visuelle « Platelift » (ex-« Life Sport Tracker »).
 * Extraites de Life Sport Tracker.dc.html (Claude Design), 2026-08-15.
 */
export type PaletteId = 'lst' | 'foret' | 'ardoise' | 'amethyste' | 'nuit';
export const DEFAULT_PALETTE: PaletteId = 'lst';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  secondary: string;
  /** Vert emeraude : la couleur du domaine nutrition et des etats de reussite. */
  tertiary: string;
  success: string;
  danger: string;
  accentSoft: string;
  overlay: string;
}

/**
 * `lst` est l'identité Platelift et reste le défaut. Les autres palettes sont
 * des choix de personnalisation (Réglages > Apparence) : mêmes rôles, mêmes
 * seuils de contraste, vérifiés par src/theme/__tests__/identite.test.ts.
 */
export const PALETTES: Record<
  PaletteId,
  { id: PaletteId; labelKey: string; mode: 'light' | 'dark'; colors: ThemeColors }
> = {
  lst: {
    id: 'lst',
    labelKey: 'settings.paletteName.lst',
    mode: 'light',
    colors: {
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
    },
  },
  foret: {
    id: 'foret',
    labelKey: 'settings.paletteName.foret',
    mode: 'light',
    colors: {
      bg: '#fafaf7',
      surface: '#ffffff',
      surfaceAlt: '#eff3ee',
      border: '#e0e6de',
      textPrimary: '#1a2e23',
      textSecondary: '#4f5f55',
      textMuted: '#859189',
      primary: '#1e3a2b',
      primaryText: '#ffffff',
      secondary: '#2f7a4a',
      tertiary: '#0f766e',
      success: '#047857',
      danger: '#d33a2c',
      accentSoft: 'rgba(47,122,74,0.10)',
      overlay: 'rgba(16,30,22,0.50)',
    },
  },
  ardoise: {
    id: 'ardoise',
    labelKey: 'settings.paletteName.ardoise',
    mode: 'light',
    colors: {
      bg: '#fafafa',
      surface: '#ffffff',
      surfaceAlt: '#f1f2f4',
      border: '#e2e4e8',
      textPrimary: '#1f2328',
      textSecondary: '#565c66',
      textMuted: '#8b919a',
      primary: '#24292f',
      primaryText: '#ffffff',
      secondary: '#c2410c',
      tertiary: '#047857',
      success: '#047857',
      danger: '#d0342c',
      accentSoft: 'rgba(194,65,12,0.10)',
      overlay: 'rgba(20,22,26,0.50)',
    },
  },
  amethyste: {
    id: 'amethyste',
    labelKey: 'settings.paletteName.amethyste',
    mode: 'light',
    colors: {
      bg: '#fbfaff',
      surface: '#ffffff',
      surfaceAlt: '#f3f1fa',
      border: '#e5e1f0',
      textPrimary: '#241b3d',
      textSecondary: '#5a5470',
      textMuted: '#8e88a3',
      primary: '#2e2152',
      primaryText: '#ffffff',
      secondary: '#6d3fd4',
      tertiary: '#047857',
      success: '#047857',
      danger: '#e0352b',
      accentSoft: 'rgba(109,63,212,0.10)',
      overlay: 'rgba(26,18,48,0.50)',
    },
  },
  // Mode sombre : `primary` devient clair (boutons et cartes héros clairs sur
  // fond nuit, texte `primaryText` foncé), comme l'inverse de la palette claire.
  nuit: {
    id: 'nuit',
    labelKey: 'settings.paletteName.nuit',
    mode: 'dark',
    colors: {
      bg: '#0b1220',
      surface: '#141d2f',
      surfaceAlt: '#1c273b',
      border: '#26324a',
      textPrimary: '#e8edf5',
      textSecondary: '#a9b4c4',
      textMuted: '#7d8899',
      primary: '#8fb0ff',
      primaryText: '#0b1220',
      secondary: '#7aa7ff',
      tertiary: '#34d399',
      success: '#34d399',
      danger: '#f87171',
      accentSoft: 'rgba(122,167,255,0.16)',
      overlay: 'rgba(0,0,0,0.60)',
    },
  },
};

export const RAMP_INK = { 100:'#e3e6ec', 200:'#c3c9d5', 300:'#94a0b6',
                          600:'#101a2c', 700:'#0b1220', 800:'#070c16' } as const;
export const RAMP_WARM = { 200:'#f2f4f7', 300:'#e4e6ea', 400:'#c8cdd6',
                           500:'#8a94a3', 700:'#55606f', 800:'#1b2a44',
                           900:'#0e1727' } as const;
