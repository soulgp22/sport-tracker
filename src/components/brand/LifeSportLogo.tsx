import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import { useColors } from '../../theme/useColors';

interface LifeSportLogoProps {
  compact?: boolean;
}

export function LifeSportLogo({ compact = false }: LifeSportLogoProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View
      style={styles.lockup}
      accessibilityRole="image"
      accessibilityLabel="Logo Life Sport Tracker">
      <View style={[styles.mark, compact ? styles.markCompact : null]}>
        <Text style={[styles.monogram, compact ? styles.monogramCompact : null]}>LS</Text>
        <View style={styles.pulseBadge}>
          <Ionicons name="pulse" size={compact ? 10 : 12} color={c.primaryText} />
        </View>
      </View>

      {!compact ? (
        <View style={styles.wordmark}>
          <Text style={styles.life}>LIFE</Text>
          <Text style={styles.sport}>SPORT TRACKER</Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
    transform: [{ rotate: '-4deg' }],
    shadowColor: c.overlay,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  markCompact: {
    width: 34,
    height: 34,
    borderRadius: 11,
  },
  monogram: {
    color: c.primaryText,
    fontFamily: fonts.sansHeavy,
    fontSize: 17,
    letterSpacing: -0.8,
  },
  monogramCompact: { fontSize: 12 },
  pulseBadge: {
    position: 'absolute',
    right: -5,
    bottom: -4,
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.secondary,
    borderWidth: 2,
    borderColor: c.bg,
  },
  wordmark: { gap: 0 },
  life: {
    color: c.primary,
    fontFamily: fonts.sansHeavy,
    fontSize: 12,
    letterSpacing: 3.2,
    lineHeight: 14,
  },
  sport: {
    color: c.textPrimary,
    fontFamily: fonts.serifBold,
    fontSize: 20,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
});
