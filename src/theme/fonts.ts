export type FontId = 'lst' | 'classique' | 'athletique' | 'lisible';
export const DEFAULT_FONT: FontId = 'lst';

export interface FontTokens {
  serif: string;
  serifBold: string;
  serifItalic: string;
  sans: string;
  sansSemi: string;
  sansBold: string;
  sansHeavy: string;
  display: string;
  displayHeavy: string;
}

/**
 * Thèmes de police proposés dans Réglages > Apparence. `lst` est l'identité
 * Platelift et reste le défaut. Chaque nom de famille doit être chargé par
 * `FONT_FILES` (fontFiles.ts), sinon Android retombe sans bruit sur la police
 * système : un test le vérifie.
 */
export const FONT_THEMES: Record<
  FontId,
  { id: FontId; labelKey: string; descriptionKey: string; tokens: FontTokens }
> = {
  lst: {
    id: 'lst',
    labelKey: 'settings.fontTheme.lst',
    descriptionKey: 'settings.fontTheme.lst.description',
    tokens: {
      serif: 'Oswald_600SemiBold',
      serifBold: 'Oswald_700Bold',
      serifItalic: 'Oswald_500Medium',
      sans: 'Archivo_400Regular',
      sansSemi: 'Archivo_600SemiBold',
      sansBold: 'Archivo_700Bold',
      sansHeavy: 'Archivo_800ExtraBold',
      display: 'OstrichSans-Medium',
      displayHeavy: 'OstrichSans-Heavy',
    },
  },
  classique: {
    id: 'classique',
    labelKey: 'settings.fontTheme.classique',
    descriptionKey: 'settings.fontTheme.classique.description',
    tokens: {
      serif: 'Fraunces_600SemiBold',
      serifBold: 'Fraunces_700Bold',
      serifItalic: 'Fraunces_500Medium',
      sans: 'HankenGrotesk_400Regular',
      sansSemi: 'HankenGrotesk_600SemiBold',
      sansBold: 'HankenGrotesk_700Bold',
      sansHeavy: 'HankenGrotesk_800ExtraBold',
      display: 'Fraunces_600SemiBold',
      displayHeavy: 'Fraunces_800ExtraBold',
    },
  },
  athletique: {
    id: 'athletique',
    labelKey: 'settings.fontTheme.athletique',
    descriptionKey: 'settings.fontTheme.athletique.description',
    tokens: {
      serif: 'BarlowCondensed_600SemiBold',
      serifBold: 'BarlowCondensed_700Bold',
      serifItalic: 'BarlowCondensed_500Medium',
      sans: 'Barlow_400Regular',
      sansSemi: 'Barlow_600SemiBold',
      sansBold: 'Barlow_700Bold',
      sansHeavy: 'Barlow_800ExtraBold',
      display: 'BarlowCondensed_600SemiBold',
      displayHeavy: 'BarlowCondensed_800ExtraBold',
    },
  },
  // Atkinson Hyperlegible n'a que deux graisses : 700 tient lieu de demi-gras,
  // gras et extra-gras. Choix d'accessibilité (lettres conçues pour ne pas se
  // confondre), pas d'esthétique.
  lisible: {
    id: 'lisible',
    labelKey: 'settings.fontTheme.lisible',
    descriptionKey: 'settings.fontTheme.lisible.description',
    tokens: {
      serif: 'AtkinsonHyperlegible_700Bold',
      serifBold: 'AtkinsonHyperlegible_700Bold',
      serifItalic: 'AtkinsonHyperlegible_700Bold',
      sans: 'AtkinsonHyperlegible_400Regular',
      sansSemi: 'AtkinsonHyperlegible_700Bold',
      sansBold: 'AtkinsonHyperlegible_700Bold',
      sansHeavy: 'AtkinsonHyperlegible_700Bold',
      display: 'AtkinsonHyperlegible_700Bold',
      displayHeavy: 'AtkinsonHyperlegible_700Bold',
    },
  },
};

let activeFontId: FontId = DEFAULT_FONT;

export function activateFont(fontId: FontId | undefined) {
  activeFontId = fontId ?? DEFAULT_FONT;
}

function currentFonts(): FontTokens {
  return FONT_THEMES[activeFontId].tokens;
}

// Ces getters permettent aux styles existants de conserver `fonts.sans`,
// tout en récupérant la famille actuellement choisie à chaque nouveau rendu.
export const fonts: FontTokens = {
  get serif() { return currentFonts().serif; },
  get serifBold() { return currentFonts().serifBold; },
  get serifItalic() { return currentFonts().serifItalic; },
  get sans() { return currentFonts().sans; },
  get sansSemi() { return currentFonts().sansSemi; },
  get sansBold() { return currentFonts().sansBold; },
  get sansHeavy() { return currentFonts().sansHeavy; },
  get display() { return currentFonts().display; },
  get displayHeavy() { return currentFonts().displayHeavy; },
};
