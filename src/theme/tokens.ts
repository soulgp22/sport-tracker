/**
 * Design tokens v1.3.0 — source unique pour l'espacement, les rayons, la
 * typographie et les ombres. Objectif : remplacer progressivement les valeurs
 * magiques dispersées dans les écrans (10+ rayons, 12+ tailles de police).
 *
 * Principes (skill mobile-app-ui-design) :
 * - grille 4/8 pt pour tous les espacements ;
 * - hiérarchie par la taille, la graisse et l'opacité, pas par l'empilement de
 *   styles ad hoc ;
 * - ombres douces teintées par la palette, jamais de noir pur sur fond coloré.
 */

import type { ThemeColors } from './palettes';
import { fonts } from './fonts';
import type { TextStyle, ViewStyle } from 'react-native';

/* ---------------------------------- Spacing --------------------------------- */

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

/* ---------------------------------- Radius ---------------------------------- */

export const radius = {
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  pill: 0,
} as const;

/* --------------------------------- Typography -------------------------------- */

/**
 * Échelle typographique unique (7 niveaux, 3 graisses max à l'écran).
 * `display` = chiffres héros / grands titres ; `title` = titre d'écran ou de
 * carte principale ; `subtitle` = titre secondaire ; `body` = texte courant ;
 * `caption` = texte secondaire ; `micro` = labels, kickers ; `tiny` = eyebrow.
 */
export interface TypeScale {
  display: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  body: TextStyle;
  caption: TextStyle;
  micro: TextStyle;
  tiny: TextStyle;
}

export function makeTypeScale(): TypeScale {
  return {
    display: { fontFamily: fonts.sansHeavy, fontSize: 28, lineHeight: 32 },
    title: { fontFamily: fonts.sansBold, fontSize: 20, lineHeight: 24 },
    subtitle: { fontFamily: fonts.sansSemi, fontSize: 16, lineHeight: 20 },
    body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21 },
    caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 17 },
    micro: { fontFamily: fonts.sansSemi, fontSize: 12, lineHeight: 15 },
    tiny: {
      fontFamily: fonts.sansBold,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
  };
}

/* ---------------------------------- Shadows ---------------------------------- */

export interface ShadowSet {
  /** Carte posée sur le fond (élévation faible). */
  card: ViewStyle;
  /** Élément flottant : CTA principal, modale, tab bar. */
  raised: ViewStyle;
}

/**
 * Ombres douces teintées : la couleur d'ombre suit la palette (overlay), avec
 * des opacités faibles et de grands rayons de flou.
 */
export function makeShadows(c: ThemeColors): ShadowSet {
  return {
    card: {
      shadowColor: c.overlay,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    raised: {
      shadowColor: c.overlay,
      shadowOpacity: 0.22,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  };
}

/* -------------------------------- Touch targets ------------------------------ */

/** Taille tactile minimale (44 pt recommandé). */
export const TOUCH_TARGET = 44;

/* --------------------------------- Surfaces ---------------------------------- */

/** Style de carte standard : fond surface, rayon lg, ombre douce. */
export function cardSurface(c: ThemeColors, shadows: ShadowSet): ViewStyle {
  return {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    ...shadows.card,
  };
}

/** Ombre douce de carte seule (à spreader dans les styles existants). */
export function cardShadow(c: ThemeColors): ViewStyle {
  return makeShadows(c).card;
}
