import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { getGymProfile } from '../../constants/gymProfiles';
import type { GymProfileId } from '../../types/gym';

export function GymBrandBadge({
  gymId,
  size = 42,
  style,
}: {
  gymId: GymProfileId;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const profile = getGymProfile(gymId);
  const styles = useMemo(() => makeStyles(size), [size]);

  return (
    <View
      accessibilityLabel={profile.name}
      style={[
        styles.badge,
        { backgroundColor: profile.brandColor, borderColor: profile.brandTextColor },
        style,
      ]}>
      <Text style={[styles.text, { color: profile.brandTextColor }]}>{profile.iconText}</Text>
    </View>
  );
}

const makeStyles = (size: number) =>
  StyleSheet.create({
    badge: {
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.28),
      borderWidth: Math.max(1, Math.round(size * 0.04)),
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontSize: Math.max(11, Math.round(size * 0.34)),
      fontWeight: '900',
      letterSpacing: -0.5,
    },
  });
