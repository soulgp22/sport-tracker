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

export const PALETTES: Record<
  PaletteId,
  { id: PaletteId; label: string; mode: 'light' | 'dark'; colors: ThemeColors }
> = {
  lst: {
    id: 'lst',
    label: 'Life Sport Tracker',
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
      success: '#10a06a',
      danger: '#ef3d2a',
      accentSoft: 'rgba(31,95,224,0.10)',
      overlay: 'rgba(14,23,39,0.50)',
    },
  },
};

export const RAMP_INK = { 100:'#e3e6ec', 200:'#c3c9d5', 300:'#94a0b6',
                          600:'#101a2c', 700:'#0b1220', 800:'#070c16' } as const;
export const RAMP_WARM = { 200:'#f2f4f7', 300:'#e4e6ea', 400:'#c8cdd6',
                           500:'#8a94a3', 700:'#55606f', 800:'#1b2a44',
                           900:'#0e1727' } as const;
