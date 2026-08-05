import { useMemo, type PropsWithChildren } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { cardSurface, makeShadows, radius, spacing, type ShadowSet } from '../../theme/tokens';

interface CardProps extends PropsWithChildren {
  /** Rend la carte tappable (feedback pressed + accessibilityRole button). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** flat : pas d'ombre ni bordure (carte secondaire posée dans une autre). */
  flat?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * Carte standard du design system v1.3.0 : surface, rayon lg, ombre douce
 * teintée. À utiliser partout à la place des View ad hoc
 * `backgroundColor: c.surface` + borderRadius maison.
 */
export function Card({
  children,
  onPress,
  style,
  flat,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: CardProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c, makeShadows(c)), [c]);

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.base, flat ? styles.flat : null, style]}
        onPress={onPress}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.base, flat ? styles.flat : null, style]} testID={testID}>
      {children}
    </View>
  );
}

const makeStyles = (c: ThemeColors, shadows: ShadowSet) =>
  StyleSheet.create({
    base: {
      ...cardSurface(c, shadows),
      padding: spacing.md,
    },
    flat: {
      borderWidth: 0,
      shadowOpacity: 0,
      elevation: 0,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
    },
  });
