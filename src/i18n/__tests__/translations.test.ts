import { TRANSLATIONS, type LanguageId } from '../../i18n/translations';

describe('translations completeness', () => {
  const languages: LanguageId[] = ['fr', 'en', 'es', 'de'];

  it('all four translation tables have the exact same set of keys', () => {
    const keysByLang: Record<LanguageId, string[]> = {} as Record<LanguageId, string[]>;

    for (const lang of languages) {
      keysByLang[lang] = Object.keys(TRANSLATIONS[lang]).sort();
    }

    const referenceKeys = keysByLang.fr;
    const referenceSet = new Set(referenceKeys);

    const missingByLang: Record<string, string[]> = {};

    for (const lang of languages) {
      const langKeys = new Set(keysByLang[lang]);
      const missingFromLang = referenceKeys.filter((k) => !langKeys.has(k));
      const extraInLang = keysByLang[lang].filter((k) => !referenceSet.has(k));

      if (missingFromLang.length > 0 || extraInLang.length > 0) {
        missingByLang[lang] = [];
        if (missingFromLang.length > 0) {
          missingByLang[lang].push(
            `Missing ${missingFromLang.length} key(s): ${missingFromLang.join(', ')}`
          );
        }
        if (extraInLang.length > 0) {
          missingByLang[lang].push(
            `Extra ${extraInLang.length} key(s): ${extraInLang.join(', ')}`
          );
        }
      }
    }

    const failures = Object.entries(missingByLang);
    if (failures.length > 0) {
      const message = failures
        .map(([lang, msgs]) => `\n  ${lang.toUpperCase()}: ${msgs.join(' | ')}`)
        .join('');
      throw new Error(`Translation key mismatch detected:${message}`);
    }

    expect(referenceKeys.length).toBeGreaterThan(0);
  });
});
