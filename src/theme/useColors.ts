import { useThemeStore } from '../store/themeStore';
import { PALETTES, type ThemeColors } from './palettes';

export function useColors(): ThemeColors {
  const paletteId = useThemeStore((state) => state.paletteId);
  return PALETTES[paletteId].colors;
}

export function useThemeMode(): 'light' | 'dark' {
  const paletteId = useThemeStore((state) => state.paletteId);
  return PALETTES[paletteId].mode;
}
