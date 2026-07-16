import { useCallback, useMemo } from 'react';

import { useLanguageStore } from '../store/languageStore';
import {
  LANGUAGE_OPTIONS,
  translate,
  translateRaw,
  type LanguageId,
} from './translations';

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const t = useCallback(
    (key: string, variables?: Record<string, string | number>) =>
      translate(language, key, variables),
    [language]
  );
  const tr = useCallback((value: string) => translateRaw(language, value), [language]);
  const locale = useMemo(
    () => LANGUAGE_OPTIONS.find((option) => option.id === language)?.locale ?? 'fr-FR',
    [language]
  );

  return { language, locale, setLanguage, t, tr };
}

export function getCurrentLanguage(): LanguageId {
  return useLanguageStore.getState().language;
}
