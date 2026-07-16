import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LanguageId } from '../i18n/translations';
import { asyncStorageAdapter } from '../storage/storageAdapter';

interface LanguageState {
  language: LanguageId;
  setLanguage: (language: LanguageId) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'fr',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'language-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
    }
  )
);
