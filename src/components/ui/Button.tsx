import { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';
import { makeShadows, radius, TOUCH_TARGET, type ShadowSet } from '../../theme/tokens';
import { useTranslation } from '../../i18n/useTranslation';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  /**
   * primary : CTA plein ; soft : fond accentué léger (actions secondaires
   * mises en avant) ; secondary : contour ; ghost : texte seul ; danger.
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'soft' | 'ghost';
  loading?: boolean;
  /** compact : hauteur 40 au lieu de 48 (listes, barres d'outils). */
  compact?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  loading,
  compact,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const c = useColors();
  const { tr } = useTranslation();
  const styles = useMemo(() => makeStyles(c, makeShadows(c)), [c]);
  const translatedTitle = tr(title);
  const spinnerColor =
    variant === 'primary' || variant === 'danger' ? c.primaryText : c.primary;
  return (
    <TouchableOpacity
      style={[
        styles.base,
        compact ? styles.baseCompact : null,
        styles[variant],
        disabled || loading ? styles.disabled : null,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={translatedTitle}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], compact ? styles.labelCompact : null]}>
          {translatedTitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors, shadows: ShadowSet) =>
  StyleSheet.create({
    base: {
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    baseCompact: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 14 },
    primary: { backgroundColor: c.primary, ...shadows.raised },
    soft: { backgroundColor: c.accentSoft },
    secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.primary },
    ghost: { backgroundColor: 'transparent', minHeight: TOUCH_TARGET },
    danger: { backgroundColor: c.danger },
    disabled: { opacity: 0.5 },
    label: { fontFamily: fonts.sansSemi, fontSize: 16 },
    labelCompact: { fontSize: 14 },
    label_primary: { color: c.primaryText },
    label_soft: { color: c.primary },
    label_secondary: { color: c.primary },
    label_ghost: { color: c.primary },
    label_danger: { color: c.primaryText },
  });
