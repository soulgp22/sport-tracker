import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_PALETTE, type PaletteId } from '../theme/palettes';

interface ThemeState {
  paletteId: PaletteId;
  setPalette: (id: PaletteId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      paletteId: DEFAULT_PALETTE,
      setPalette: (paletteId) => set({ paletteId }),
    }),
    {
      name: 'theme-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
    }
  )
);
