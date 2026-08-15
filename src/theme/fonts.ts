export type FontId = 'lst';
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

export const FONT_THEMES: Record<
  FontId,
  { id: FontId; label: string; description: string; tokens: FontTokens }
> = {
  lst: {
    id: 'lst',
    label: 'Life Sport Tracker',
    description: 'Identité visuelle unique',
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
