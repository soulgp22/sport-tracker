import { useMemo } from 'react';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useProgramStore } from '../../../store/programStore';
import { useActiveSessionStore } from '../../../store/activeSessionStore';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { useColors } from '../../../theme/useColors';
import { fonts } from '../../../theme/fonts';
import type { ThemeColors } from '../../../theme/palettes';
import { cardShadow, radius, spacing } from '../../../theme/tokens';
import { useTranslation } from '../../../i18n/useTranslation';
import type { Program, ProgramDay } from '../../../types';

export default function SessionScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { t } = useTranslation();
  const router = useRouter();
  const programs = useProgramStore((s) => s.programs);
  const startSession = useActiveSessionStore((s) => s.startSession);
  const active = useActiveSessionStore((s) => s.active);

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedDay, setSelectedDay] = useState<ProgramDay | null>(null);

  // If there is already an active session, show resume button
  if (active) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* « Séance en cours » monte dans l'en-tête : le répéter sous l'icône
            ferait deux titres identiques l'un sur l'autre. */}
        <ScreenHeader kicker={t('nav.session')} title={t('session.resumeTitle')} />
        <View style={styles.resumeContainer}>
          <Ionicons name="play-circle" size={64} color={c.primary} />
          <Text style={styles.resumeSub}>{active.programName} — {active.dayName}</Text>
          <Button title={t('session.resume')} onPress={() => router.push('/(tabs)/session/active')} style={styles.resumeBtn} />
        </View>
      </SafeAreaView>
    );
  }

  const handleStart = () => {
    if (!selectedProgram || !selectedDay) return;
    startSession(selectedProgram, selectedDay);
    router.push('/(tabs)/session/active');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader kicker={t('nav.session')} title={t('home.startSession')} />
      {/* Deux raccourcis de navigation : même rangée à cases que les
          sous-actions de Nutrition (« Scanner un code-barres | Ajouter un
          repas »), libellés Oswald en capitales. L'action principale de
          l'écran reste le choix d'un programme, dessous. */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.subAction, styles.subActionDivider]}
          onPress={() => router.push('/(tabs)/programs')}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={t('session.managePrograms')}>
          <Text style={styles.subActionLabel}>{t('session.managePrograms')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.subAction}
          onPress={() => router.push('/(tabs)/exercises')}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={t('nav.exercises')}>
          <Text style={styles.subActionLabel}>{t('nav.exercises')}</Text>
        </TouchableOpacity>
      </View>

      {programs.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title={t('session.noPrograms')}
          subtitle={t('session.noProgramsSubtitle')}
          actionLabel={t('nav.programs')}
          onAction={() => router.push('/(tabs)/programs')}
        />
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(p) => p.id}
          renderItem={({ item: program }) => (
            <View>
              <TouchableOpacity
                style={[styles.programRow, selectedProgram?.id === program.id && styles.selected]}
                onPress={() => {
                  setSelectedProgram(program);
                  setSelectedDay(null);
                }}
                activeOpacity={0.75}>
                <Text style={styles.programName}>{program.name}</Text>
                <Ionicons
                  name={selectedProgram?.id === program.id ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={c.textSecondary}
                />
              </TouchableOpacity>

              {selectedProgram?.id === program.id &&
                program.days.map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={[styles.dayRow, selectedDay?.id === day.id && styles.daySelected]}
                    onPress={() => setSelectedDay(day)}
                    activeOpacity={0.75}>
                    <Ionicons
                      name={selectedDay?.id === day.id ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selectedDay?.id === day.id ? c.primary : c.textMuted}
                    />
                    <Text style={styles.dayName}>{day.name}</Text>
                    <Text style={styles.dayMeta}>{t(day.exercises.length !== 1 ? 'program.exerciseCount.other' : 'program.exerciseCount.one', { count: day.exercises.length })}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}

      {selectedDay && (
        <View style={styles.footer}>
          <Button title={t('session.startDay', { day: selectedDay.name })} onPress={handleStart} />
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  list: { paddingBottom: 100 },
  // Même carte que ProgramCard (écran Programmes) : un programme a la même
  // apparence dans les deux menus.
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...cardShadow(c),
  },
  selected: { borderWidth: 2, borderColor: c.primary },
  programName: { flex: 1, fontSize: 16, lineHeight: 20, fontFamily: fonts.sansBold, color: c.textPrimary },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 2,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    padding: 12,
  },
  daySelected: { backgroundColor: c.accentSoft },
  dayName: { flex: 1, fontSize: 15, color: c.textPrimary, fontFamily: fonts.sansSemi },
  // Sans fontFamily, Android retombe sur la police système (Roboto,
  // SamsungOne…) : le nombre d'exercices s'affichait dans une autre police.
  dayMeta: { fontSize: 13, fontFamily: fonts.sans, color: c.textMuted },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  actionsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  subAction: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  subActionDivider: { borderRightWidth: 1, borderRightColor: c.border },
  subActionLabel: {
    fontFamily: fonts.serifBold,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    color: c.textPrimary,
  },
  resumeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  resumeSub: { fontSize: 15, fontFamily: fonts.sans, color: c.textSecondary },
  resumeBtn: { width: '100%', marginTop: 8 },
});
