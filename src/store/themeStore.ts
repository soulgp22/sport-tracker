import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_FONT, type FontId } from '../theme/fonts';
import { DEFAULT_PALETTE, type PaletteId } from '../theme/palettes';

export type { FontId } from '../theme/fonts';

interface ThemeState {
  paletteId: PaletteId;
  fontId: FontId;
  setPalette: (id: PaletteId) => void;
  setFont: (id: FontId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      paletteId: DEFAULT_PALETTE,
      fontId: DEFAULT_FONT,
      setPalette: (paletteId) => set({ paletteId }),
      setFont: (fontId) => set({ fontId }),
    }),
    {
      name: 'theme-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
    }
  )
);
