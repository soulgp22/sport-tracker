import { useMemo } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getGymProfile } from '../../constants/gymProfiles';
import { useColors } from '../../theme/useColors';
import type { GymProfileId } from '../../types/gym';

const GYM_LOGOS: Partial<
  Record<
    GymProfileId,
    {
      source: number;
      backgroundColor: string;
      padding: number;
    }
  >
> = {
  'fitness-park': {
    source: require('../../../assets/gyms/fitness-park.png'),
    backgroundColor: '#E30613',
    padding: 6,
  },
  'basic-fit': {
    source: require('../../../assets/gyms/basic-fit.png'),
    backgroundColor: '#FFFFFF',
    padding: 7,
  },
  'on-air': {
    source: require('../../../assets/gyms/on-air.png'),
    backgroundColor: '#FFFFFF',
    padding: 5,
  },
  'planet-fitness': {
    source: require('../../../assets/gyms/planet-fitness.png'),
    backgroundColor: '#FFFFFF',
    padding: 5,
  },
  'la-fitness': {
    source: require('../../../assets/gyms/la-fitness.png'),
    backgroundColor: '#FFFFFF',
    padding: 6,
  },
  'golds-gym': {
    source: require('../../../assets/gyms/golds-gym.png'),
    backgroundColor: '#111111',
    padding: 5,
  },
};

export function GymBrandBadge({
  gymId,
  size = 42,
  width = Math.round(size * 1.35),
  style,
}: {
  gymId: GymProfileId;
  size?: number;
  width?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const profile = getGymProfile(gymId);
  const logo = GYM_LOGOS[gymId];
  const styles = useMemo(() => makeStyles(size, width), [size, width]);

  return (
    <View
      accessibilityLabel={profile.name}
      style={[
        styles.badge,
        {
          backgroundColor: logo?.backgroundColor ?? c.surfaceAlt,
          borderColor: gymId === 'all' ? c.border : '#D8DEE8',
          padding: logo?.padding ?? 0,
        },
        style,
      ]}>
      {logo ? (
        <Image
          source={logo.source}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel={profile.name}
        />
      ) : (
        <Ionicons name="business-outline" size={Math.round(size * 0.46)} color={c.textMuted} />
      )}
    </View>
  );
}

const makeStyles = (size: number, width: number) =>
  StyleSheet.create({
    badge: {
      width,
      height: size,
      borderRadius: Math.round(size * 0.22),
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    logo: { width: '100%', height: '100%' },
  });
