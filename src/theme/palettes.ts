export type PaletteId = 'oxford' | 'ecurie' | 'regiment' | 'sousbois';

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
export const DEFAULT_PALETTE: PaletteId = 'oxford';

export const PALETTES: Record<
  PaletteId,
  { id: PaletteId; label: string; mode: 'light' | 'dark'; colors: ThemeColors }
> = {
  oxford: {
    id: 'oxford',
    label: 'Oxford',
    mode: 'light',
    colors: {
      bg: '#ECE5D6', surface: '#F3EEE1', surfaceAlt: '#E7DDCA', border: '#D3C8B2',
      textPrimary: '#23201A', textSecondary: '#6E6553', textMuted: '#8A7F6A',
      primary: '#7A3B32', primaryText: '#F3EEE1', secondary: '#4F6B4A', success: '#4F6B4A', danger: '#9E4A3C',
      accentSoft: 'rgba(122,59,50,0.12)', overlay: 'rgba(35,32,26,0.45)',
    },
  },
  ecurie: {
    id: 'ecurie',
    label: 'Écurie',
    mode: 'dark',
    colors: {
      bg: '#211A14', surface: '#2B231B', surfaceAlt: '#342A20', border: '#40352A',
      textPrimary: '#EFE6D6', textSecondary: '#A7967F', textMuted: '#7C6C58',
      primary: '#C08A4A', primaryText: '#1C1109', secondary: '#9E4A3C', success: '#8A9A6B', danger: '#9E4A3C',
      accentSoft: 'rgba(192,138,74,0.16)', overlay: 'rgba(0,0,0,0.6)',
    },
  },
  regiment: {
    id: 'regiment',
    label: 'Régiment',
    mode: 'dark',
    colors: {
      bg: '#17202E', surface: '#1F2A3A', surfaceAlt: '#253044', border: '#33415A',
      textPrimary: '#ECE7DA', textSecondary: '#93A0B4', textMuted: '#6E7A8C',
      primary: '#C2A15A', primaryText: '#1A1206', secondary: '#B15442', success: '#7FA08C', danger: '#B15442',
      accentSoft: 'rgba(194,161,90,0.16)', overlay: 'rgba(0,0,0,0.6)',
    },
  },
  sousbois: {
    id: 'sousbois',
    label: 'Sous-bois',
    mode: 'dark',
    colors: {
      bg: '#182019', surface: '#212B22', surfaceAlt: '#28332A', border: '#354135',
      textPrimary: '#ECE8DB', textSecondary: '#98A493', textMuted: '#6E7A70',
      primary: '#B08D57', primaryText: '#14201D', secondary: '#A65442', success: '#86A98C', danger: '#A65442',
      accentSoft: 'rgba(176,141,87,0.16)', overlay: 'rgba(0,0,0,0.6)',
    },
  },
};
