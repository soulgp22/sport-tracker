import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';
import { DEFAULT_FONT, FONT_THEMES, type FontId } from '../theme/fonts';
import { DEFAULT_PALETTE, PALETTES, type PaletteId } from '../theme/palettes';

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
      merge: (persisted, current) => {
        // Pourquoi ce merge existe : les identifiants de palette et de police ont
        // changé ; un état persisté par une version antérieure contient une valeur
        // qui n'existe plus, et `PALETTES[id].colors` lèverait. Sans ce filet, la
        // réhydratation recopierait l'identifiant tel quel et l'app planterait au
        // premier rendu pour tout utilisateur existant.
        //
        // merge ne doit JAMAIS lever : un store qui explose pendant sa réhydratation
        // empêche l'app de démarrer — précisément le problème qu'on corrige ici.
        try {
          // Le contenu du stockage est une entrée NON FIABLE (comme un paramètre de
          // route) : undefined, null, nombre, objet, chaîne vide… On ne suppose
          // jamais qu'il est bien formé.
          if (!persisted || typeof persisted !== 'object') {
            return { ...current, paletteId: DEFAULT_PALETTE, fontId: DEFAULT_FONT };
          }
          const saved = persisted as Record<string, unknown>;

          // Un identifiant n'est conservé QUE s'il existe encore dans le registre
          // correspondant (la source de vérité), sinon on retombe sur la valeur par
          // défaut. On n'écrit pas en dur la liste des anciens identifiants : elle
          // rechangerait et recréerait ce bug.
          const paletteId: PaletteId =
            typeof saved.paletteId === 'string' &&
            Object.prototype.hasOwnProperty.call(PALETTES, saved.paletteId)
              ? (saved.paletteId as PaletteId)
              : DEFAULT_PALETTE;

          const fontId: FontId =
            typeof saved.fontId === 'string' &&
            Object.prototype.hasOwnProperty.call(FONT_THEMES, saved.fontId)
              ? (saved.fontId as FontId)
              : DEFAULT_FONT;

          return { ...current, paletteId, fontId };
        } catch {
          // Dernier recours : renvoyer l'état courant inchangé plutôt que de laisser
          // la réhydratation faire planter le démarrage.
          return { ...current };
        }
      },
    }
  )
);
