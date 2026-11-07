import { useMemo } from 'react';

import { useThemeStore } from '../store/themeStore';
import { PALETTES, type ThemeColors } from './palettes';

export function useColors(): ThemeColors {
  const paletteId = useThemeStore((state) => state.paletteId);
  const fontId = useThemeStore((state) => state.fontId);

  // `fontId` est RECOPIÉ dans l'objet renvoyé : une nouvelle référence par
  // police force les 57 `useMemo(() => makeStyles(c), [c])` à relire les jetons
  // de `fonts`. Une simple dépendance inutilisée ne suffit pas : le React
  // Compiler retire les dépendances qu'aucun calcul ne lit (known_bugs.md,
  // « React Compiler »). La police active est posée par le store
  // (themeStore.applyFont), jamais pendant le rendu.
  return useMemo(() => ({ ...PALETTES[paletteId].colors, fontId }), [fontId, paletteId]);
}

export function useThemeMode(): 'light' | 'dark' {
  const paletteId = useThemeStore((state) => state.paletteId);
  return PALETTES[paletteId].mode;
}
