import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GymBrandBadge } from '../gyms/GymBrandBadge';
import { getGymProfile } from '../../constants/gymProfiles';
import { useTranslation } from '../../i18n/useTranslation';
import type { Program } from '../../types';
import { useColors } from '../../theme/useColors';
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
  const gymId = program.gymProfileId ?? 'all';
  const gym = getGymProfile(gymId);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.logoColumn}>
        <GymBrandBadge gymId={gymId} size={54} width={68} />
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {program.name}
        </Text>
        <Text style={styles.meta}>
          {program.days.length} jour{program.days.length !== 1 ? 's' : ''} · {totalExercises}{' '}
          exercice{totalExercises !== 1 ? 's' : ''}
        </Text>
        <Text
          style={[styles.gymName, gymId === 'all' ? styles.gymNameMuted : null]}
          numberOfLines={1}>
          {gymId === 'all' ? t('program.noGym') : gym.name}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          hitSlop={6}>
          <Ionicons name="trash-outline" size={19} color={c.danger} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={19} color={c.textMuted} />
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
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      shadowColor: c.overlay,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
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
      fontWeight: '700',
      color: c.textPrimary,
    },
    meta: { fontSize: 13, color: c.textSecondary },
    gymName: { fontSize: 11, fontWeight: '700', color: c.primary },
    gymNameMuted: { color: c.textMuted, fontWeight: '600' },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingLeft: 2,
    },
    deleteBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
    },
  });
