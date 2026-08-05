import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EquipmentProfileBadge } from '../equipment/EquipmentProfileBadge';
import { getEquipmentProfile } from '../../constants/equipmentProfiles';
import { useTranslation } from '../../i18n/useTranslation';
import type { Program } from '../../types';
import { useColors } from '../../theme/useColors';
import { fonts } from '../../theme/fonts';
import { cardShadow, radius, spacing } from '../../theme/tokens';

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
  // Pas de profil par défaut : afficher « bodyweight » pour un programme
  // dont l'équipement est inconnu serait un mensonge visible par l'utilisateur.
  const equipmentProfileId = program.equipmentProfileId;
  const profile = equipmentProfileId ? getEquipmentProfile(equipmentProfileId) : undefined;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {equipmentProfileId ? (
        <View style={styles.logoColumn}>
          <EquipmentProfileBadge profileId={equipmentProfileId} size={54} />
        </View>
      ) : null}

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {program.name}
        </Text>
        <Text style={styles.meta}>
          {t(program.days.length !== 1 ? 'program.dayCount.other' : 'program.dayCount.one', { count: program.days.length })}
          {' · '}
          {t(totalExercises !== 1 ? 'program.exerciseCount.other' : 'program.exerciseCount.one', { count: totalExercises })}
        </Text>
        {profile ? (
          <Text style={styles.profileName} numberOfLines={1}>
            {t(profile.i18nKey)}
          </Text>
        ) : null}
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
      gap: spacing.md,
      minHeight: 98,
      marginHorizontal: spacing.md,
      marginVertical: 7,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      ...cardShadow(c),
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
