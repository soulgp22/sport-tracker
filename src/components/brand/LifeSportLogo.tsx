import { useMemo } from 'react';
import { Image } from 'expo-image';
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
        <Image
          source={require('../../../assets/images/life-sport-mark.png')}
          style={[styles.markImage, compact ? styles.markImageCompact : null]}
          contentFit="contain"
        />
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
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#071A33',
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
  markImage: { width: 46, height: 46 },
  markImageCompact: { width: 30, height: 30 },
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
