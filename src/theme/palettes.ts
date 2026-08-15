/**
 * Couleurs de l'identité visuelle « Life Sport Tracker ».
 * Extraites de Life Sport Tracker.dc.html (Claude Design), 2026-08-15.
 */

export type PaletteId = 'lst';
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
  success: string;
  danger: string;
  accentSoft: string;
  overlay: string;
}

export const BRAND_BRASS = '#B08D57';

export const PALETTES: Record<
  PaletteId,
  { id: PaletteId; label: string; mode: 'light' | 'dark'; colors: ThemeColors }
> = {
  lst: {
    id: 'lst',
    label: 'Life Sport Tracker',
    mode: 'light',
    colors: {
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
    },
  },
};

export const RAMP_INK = { 100:'#e3e6ec', 200:'#c3c9d5', 300:'#94a0b6',
                          600:'#101a2c', 700:'#0b1220', 800:'#070c16' } as const;
export const RAMP_WARM = { 200:'#e6e1d3', 300:'#d5cfbe', 400:'#b8b2a0',
                           500:'#8d897c', 700:'#4a4c50', 800:'#1b2a44',
                           900:'#0e1727' } as const;
