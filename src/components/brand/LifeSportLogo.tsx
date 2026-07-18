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
          <Text style={styles.sport}>LIFE SPORT</Text>
          <Text style={styles.life}>TRACKER</Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  mark: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCompact: {
    width: 34,
    height: 34,
  },
  markImage: { width: 44, height: 44 },
  markImageCompact: { width: 30, height: 30 },
  wordmark: { gap: 1 },
  life: {
    color: c.textSecondary,
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 3,
    lineHeight: 11,
  },
  sport: {
    color: c.textPrimary,
    fontFamily: fonts.sansHeavy,
    fontSize: 18,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
});
