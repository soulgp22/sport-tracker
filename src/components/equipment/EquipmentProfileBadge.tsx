import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getEquipmentProfile } from '../../constants/equipmentProfiles';
import { useTranslation } from '../../i18n/useTranslation';
import { useColors } from '../../theme/useColors';
import type { EquipmentProfileId } from '../../types/equipment';

interface EquipmentProfileBadgeProps {
  profileId: EquipmentProfileId | null | undefined;
  size?: number;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EquipmentProfileBadge({
  profileId,
  size = 42,
  showLabel = false,
  style,
}: EquipmentProfileBadgeProps) {
  const c = useColors();
  const { t } = useTranslation();
  const profile = getEquipmentProfile(profileId);
  const styles = useMemo(() => makeStyles(size), [size]);

  return (
    <View style={[styles.badge, { backgroundColor: c.surfaceAlt, borderColor: c.border }, style]}>
      <Ionicons
        name={profile.icon}
        size={Math.round(size * 0.46)}
        color={c.primary}
        accessibilityLabel={t(profile.i18nKey)}
      />
      {showLabel ? (
        <Text style={[styles.label, { color: c.textPrimary }]} numberOfLines={1}>
          {t(profile.i18nKey)}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (size: number) =>
  StyleSheet.create({
    badge: {
      minWidth: size,
      height: size,
      borderRadius: Math.round(size * 0.22),
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: Math.round(size * 0.18),
      overflow: 'hidden',
    },
    label: {
      fontSize: Math.round(size * 0.32),
      fontWeight: '700',
    },
  });
