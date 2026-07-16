export type FontId = 'heritage' | 'performance' | 'tech';
export const DEFAULT_FONT: FontId = 'performance';

export interface FontTokens {
  serif: string;
  serifBold: string;
  serifItalic: string;
  sans: string;
  sansSemi: string;
  sansBold: string;
  sansHeavy: string;
}

export const FONT_THEMES: Record<
  FontId,
  { id: FontId; label: string; description: string; tokens: FontTokens }
> = {
  heritage: {
    id: 'heritage',
    label: 'Heritage',
    description: 'Élégante et éditoriale',
    tokens: {
      serif: 'Fraunces_600SemiBold',
      serifBold: 'Fraunces_700Bold',
      serifItalic: 'Fraunces_400Regular_Italic',
      sans: 'HankenGrotesk_400Regular',
      sansSemi: 'HankenGrotesk_600SemiBold',
      sansBold: 'HankenGrotesk_700Bold',
      sansHeavy: 'HankenGrotesk_800ExtraBold',
    },
  },
  performance: {
    id: 'performance',
    label: 'Performance',
    description: 'Athlétique, compacte et énergique',
    tokens: {
      serif: 'BarlowCondensed_600SemiBold',
      serifBold: 'BarlowCondensed_700Bold',
      serifItalic: 'BarlowCondensed_600SemiBold_Italic',
      sans: 'Barlow_400Regular',
      sansSemi: 'Barlow_600SemiBold',
      sansBold: 'Barlow_700Bold',
      sansHeavy: 'Barlow_800ExtraBold',
    },
  },
  tech: {
    id: 'tech',
    label: 'Tech',
    description: 'Moderne, nette et digitale',
    tokens: {
      serif: 'SpaceGrotesk_600SemiBold',
      serifBold: 'SpaceGrotesk_700Bold',
      serifItalic: 'SpaceGrotesk_500Medium',
      sans: 'SpaceGrotesk_400Regular',
      sansSemi: 'SpaceGrotesk_600SemiBold',
      sansBold: 'SpaceGrotesk_700Bold',
      sansHeavy: 'SpaceGrotesk_700Bold',
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
};
