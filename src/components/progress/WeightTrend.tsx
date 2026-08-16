import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from '../../i18n/useTranslation';
import { useColors } from '../../theme/useColors';
import type { WeightEntry } from '../../types';

export type WeightTrendDirection = 'up' | 'down' | 'stable';

/**
 * Écart absolu (kg) en dessous duquel la tendance est considérée « stable ».
 * Hypothèse explicite : c'est le bruit de mesure d'une balance domestique.
 */
export const WEIGHT_STABILITY_THRESHOLD_KG = 0.2;

interface WeightTrendProps {
  /** Pesees, telles que fournies par bodyWeightStore (triees par date). */
  entries: WeightEntry[];
  /** Taille de l'icone. */
  size?: number;
}

/**
 * Fonction pure : compare la dernière pesée à la précédente.
 * Renvoie `null` quand il y a moins de deux pesées (on ne sait pas, on
 * n'affiche pas de tendance).
 */
export function getWeightTrendDirection(
  entries: WeightEntry[]
): WeightTrendDirection | null {
  if (entries.length < 2) return null;

  const latest = entries[entries.length - 1];
  const previous = entries[entries.length - 2];
  const delta = latest.weight - previous.weight;

  if (Math.abs(delta) <= WEIGHT_STABILITY_THRESHOLD_KG) return 'stable';
  return delta > 0 ? 'up' : 'down';
}

const TREND_ICONS = {
  up: 'trending-up',
  down: 'trending-down',
  stable: 'remove',
} as const;

const TREND_LABEL_KEYS: Record<WeightTrendDirection, string> = {
  up: 'weight.trendUp',
  down: 'weight.trendDown',
  stable: 'weight.trendStable',
};

export function WeightTrend({ entries, size = 14 }: WeightTrendProps) {
  const c = useColors();
  const { t } = useTranslation();

  const direction = getWeightTrendDirection(entries);
  if (direction === null) return null;

  const color =
    direction === 'up' ? c.success : direction === 'down' ? c.danger : c.textMuted;
  const label = t(TREND_LABEL_KEYS[direction]);

  return (
    <Ionicons
      name={TREND_ICONS[direction]}
      size={size}
      color={color}
      accessibilityRole="image"
      accessibilityLabel={label}
    />
  );
}
