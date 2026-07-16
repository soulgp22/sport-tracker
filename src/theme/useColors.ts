import { useMemo } from 'react';

import { useThemeStore } from '../store/themeStore';
import { activateFont } from './fonts';
import { PALETTES, type ThemeColors } from './palettes';

export function useColors(): ThemeColors {
  const paletteId = useThemeStore((state) => state.paletteId);
  const fontId = useThemeStore((state) => state.fontId);

  // La nouvelle référence force les StyleSheet dépendantes des tokens de
  // police à être recalculées lorsque la typographie change.
  return useMemo(() => {
    activateFont(fontId);
    return { ...PALETTES[paletteId].colors };
  }, [fontId, paletteId]);
}

export function useThemeMode(): 'light' | 'dark' {
  const paletteId = useThemeStore((state) => state.paletteId);
  return PALETTES[paletteId].mode;
}
