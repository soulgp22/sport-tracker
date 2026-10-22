/**
 * Dimensionnement du widget « Objectifs du jour » a partir de la taille
 * REELLE que le launcher communique (WidgetInfo.width / height, en dp).
 *
 * Lecon du 2026-10-22 : des anneaux a taille fixe (58 dp) dans une cellule
 * que le launcher Samsung rend deux fois plus haute donnaient trois petits
 * cercles illisibles au milieu du vide. Ici tout se calcule depuis la cellule.
 *
 * Deux dispositions, choisies par la forme de la cellule :
 * - `pill`  : bandeau 4×1, trois segments (mini-anneau + grand chiffre) ;
 * - `card`  : carte 2×2, grand anneau des pas + deux barres.
 * Un widget redimensionne par l'utilisateur change de disposition tout seul.
 */

export type DailyGoalsLayout = 'pill' | 'card';

/** Ratio largeur/hauteur au-dela duquel la cellule est un bandeau. */
const PILL_ASPECT_RATIO = 1.9;
/** Hauteur minimale (dp) pour qu'une carte ait la place d'un grand anneau. */
const CARD_MIN_HEIGHT = 120;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function chooseDailyGoalsLayout(width: number, height: number): DailyGoalsLayout {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 'pill';
  if (height < CARD_MIN_HEIGHT) return 'pill';
  return width / height >= PILL_ASPECT_RATIO ? 'pill' : 'card';
}

export interface PillMetrics {
  layout: 'pill';
  /** Hauteur du bandeau, bornee : il n'occupe jamais toute une cellule haute. */
  height: number;
  borderRadius: number;
  paddingHorizontal: number;
  ringSize: number;
  ringStroke: number;
  valueFontSize: number;
  labelFontSize: number;
}

export interface CardMetrics {
  layout: 'card';
  width: number;
  height: number;
  borderRadius: number;
  padding: number;
  ringSize: number;
  ringStroke: number;
  ringValueFontSize: number;
  ringGoalFontSize: number;
  rowFontSize: number;
  rowValueFontSize: number;
  barHeight: number;
  /** Largeur utile d'une barre, en dp, pour calculer le remplissage. */
  barWidth: number;
}

export type DailyGoalsMetrics = PillMetrics | CardMetrics;

export function pillMetrics(width: number, height: number): PillMetrics {
  // Le bandeau garde une hauteur raisonnable meme dans une cellule haute :
  // c'est la lisibilite du chiffre qui compte, pas le remplissage.
  const h = clamp(height, 48, 76);
  const ringSize = Math.round(h * 0.48);
  return {
    layout: 'pill',
    height: h,
    borderRadius: Math.round(h / 2),
    paddingHorizontal: Math.round(clamp(width * 0.03, 8, 14)),
    ringSize,
    ringStroke: Math.max(3, Math.round(ringSize * 0.14)),
    valueFontSize: Math.round(clamp(h * 0.34, 16, 26)),
    labelFontSize: Math.round(clamp(h * 0.13, 7, 9)),
  };
}

export function cardMetrics(width: number, height: number): CardMetrics {
  const side = Math.min(width, height);
  const padding = Math.round(clamp(side * 0.08, 10, 16));
  const ringSize = Math.round(clamp(side * 0.5, 72, 140));
  return {
    layout: 'card',
    width,
    height,
    borderRadius: Math.round(clamp(side * 0.14, 16, 28)),
    padding,
    ringSize,
    ringStroke: Math.max(5, Math.round(ringSize * 0.09)),
    ringValueFontSize: Math.round(clamp(ringSize * 0.26, 18, 34)),
    ringGoalFontSize: Math.round(clamp(ringSize * 0.1, 8, 12)),
    rowFontSize: Math.round(clamp(side * 0.075, 10, 13)),
    rowValueFontSize: Math.round(clamp(side * 0.1, 13, 18)),
    barHeight: Math.max(4, Math.round(side * 0.03)),
    barWidth: Math.max(24, Math.round(width - padding * 2 - side * 0.5)),
  };
}

export function dailyGoalsMetrics(width: number, height: number): DailyGoalsMetrics {
  return chooseDailyGoalsLayout(width, height) === 'card'
    ? cardMetrics(width, height)
    : pillMetrics(width, height);
}
