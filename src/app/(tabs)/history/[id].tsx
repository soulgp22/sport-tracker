import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSessionStore } from '../../../store/sessionStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { appAlert } from '../../../components/ui/AppDialog';
import { ExerciseThumbnail } from '../../../components/exercises/ExerciseThumbnail';
import { getCatalogExerciseName } from '../../../store/exerciseCatalogStore';
import { useTranslation } from '../../../i18n/useTranslation';
import { useColors } from '../../../theme/useColors';
import { fonts } from '../../../theme/fonts';
import { cardShadow, radius, spacing } from '../../../theme/tokens';

import type { ThemeColors } from '../../../theme/palettes';

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

export default function SessionDetailScreen() {
  const { t, locale } = useTranslation();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const deleteSession = useSessionStore((s) => s.deleteSession);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="alert-circle-outline" title={t('history.notFound')} />
      </SafeAreaView>
    );
  }

  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleDelete = () => {
    appAlert(t('foods.deleteTitle'), t('dialog.deleteSessionMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => { deleteSession(id); router.back(); },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading} numberOfLines={1}>
          {session.programName ?? t('history.freeSession')}
        </Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="trash-outline" size={20} color={c.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Meta */}
        <View style={styles.metaCard}>
          <Text style={styles.metaDate}>{dateStr}</Text>
          {session.dayName ? <Text style={styles.metaDay}>{session.dayName}</Text> : null}
          <Text style={styles.metaDuration}>{t('history.duration', { duration: fmt(session.durationSeconds) })}</Text>
        </View>

        {/* Exercises */}
        {session.exercises.map((ex, i) => {
          const doneSets = ex.sets.filter((s) => s.completed);
          return (
            <View key={i} style={styles.exCard}>
              <View style={styles.exHeader}>
                <ExerciseThumbnail id={ex.exerciseId} size={40} />
                <Text style={styles.exName} numberOfLines={1}>
                  {getCatalogExerciseName(ex.exerciseId, ex.exerciseName || t('session.exerciseFallback', { index: i + 1 }))}
                </Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableCellSm]}>{t('history.columnSet')}</Text>
                <Text style={styles.tableCell}>{t('session.reps')}</Text>
                <Text style={styles.tableCell}>{t('progress.weightPlaceholder')}</Text>
              </View>
              {doneSets.map((s, si) => (
                <View key={si} style={[styles.tableRow, si % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, styles.tableCellSm]}>{si + 1}</Text>
                  <Text style={styles.tableCell}>{s.actualReps}</Text>
                  <Text style={styles.tableCell}>{s.actualWeight}</Text>
                </View>
              ))}
              {doneSets.length === 0 && (
                <Text style={styles.noSets}>{t('history.noSets')}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontSize: 18, fontFamily: fonts.sansBold, color: c.textPrimary },
  content: { padding: spacing.md, gap: 12 },
  metaCard: {
    backgroundColor: c.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  metaDate: { fontSize: 15, fontFamily: fonts.sansSemi, color: c.primary, textTransform: 'capitalize' },
  metaDay: { fontSize: 14, color: c.primary },
  metaDuration: { fontSize: 13, color: c.textSecondary, marginTop: 4 },
  exCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...cardShadow(c),
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 10 },
  exName: { flex: 1, fontSize: 16, fontFamily: fonts.sansBold, color: c.textPrimary },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: spacing.xs, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 5 },
  tableRowAlt: { backgroundColor: c.surfaceAlt },
  tableCell: { flex: 1, fontSize: 14, color: c.textPrimary, textAlign: 'center' },
  tableCellSm: { flex: 0.5, color: c.textSecondary },
  noSets: { fontSize: 13, color: c.textMuted, fontStyle: 'italic' },
});
