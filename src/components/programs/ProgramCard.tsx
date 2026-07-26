import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EquipmentProfileBadge } from '../equipment/EquipmentProfileBadge';
import { getEquipmentProfile } from '../../constants/equipmentProfiles';
import { useTranslation } from '../../i18n/useTranslation';
import type { Program } from '../../types';
import { useColors } from '../../theme/useColors';
import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';

interface ProgramCardProps {
  program: Program;
  onPress: () => void;
  onDelete: () => void;
}

export function ProgramCard({ program, onPress, onDelete }: ProgramCardProps) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const totalExercises = program.days.reduce((sum, day) => sum + day.exercises.length, 0);
  const equipmentProfileId = program.equipmentProfileId ?? 'bodyweight';
  const profile = getEquipmentProfile(equipmentProfileId);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.logoColumn}>
        <EquipmentProfileBadge profileId={equipmentProfileId} size={54} />
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {program.name}
        </Text>
        <Text style={styles.meta}>
          {t(program.days.length !== 1 ? 'program.dayCount.other' : 'program.dayCount.one', { count: program.days.length })}
          {' · '}
          {t(totalExercises !== 1 ? 'program.exerciseCount.other' : 'program.exerciseCount.one', { count: totalExercises })}
        </Text>
        <Text style={styles.profileName} numberOfLines={1}>
          {t(profile.i18nKey)}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          hitSlop={6}>
          <Ionicons name="trash-outline" size={20} color={c.danger} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      minHeight: 98,
      marginHorizontal: 16,
      marginVertical: 7,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.surface,
      shadowColor: c.overlay,
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    logoColumn: {
      width: 68,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, minWidth: 0, gap: 4 },
    name: {
      fontSize: 16,
      lineHeight: 20,
      fontFamily: fonts.sansBold,
      color: c.textPrimary,
    },
    meta: { fontSize: 13, color: c.textSecondary },
    profileName: { fontSize: 11, fontFamily: fonts.sansBold, color: c.primary },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingLeft: 2,
    },
  });
