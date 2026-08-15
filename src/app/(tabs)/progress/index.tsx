import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WeightChart } from '../../../components/progress/WeightChart';
import { VolumeChart } from '../../../components/progress/VolumeChart';
import { PerformanceDashboard } from '../../../components/progress/PerformanceDashboard';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { TextInput } from '../../../components/ui/TextInput';
import { useColors } from '../../../theme/useColors';
import { fonts } from '../../../theme/fonts';
import { cardShadow, radius, spacing } from '../../../theme/tokens';

import type { ThemeColors } from '../../../theme/palettes';
import { useProgressData, useExercisesWithHistory, type DataPoint } from '../../../hooks/useProgressData';
import { useBodyWeightStore } from '../../../store/bodyWeightStore';
import { usePerformanceStore } from '../../../store/performanceStore';
import { useSessionStore } from '../../../store/sessionStore';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  analyzeExercisePerformance,
  calculateConsistencyMetrics,
  createBadgeMetrics,
  evaluateBadgeUnlocks,
} from '../../../lib/performanceEngine';

type ProgressMode = 'exercises' | 'bodyWeight' | 'performance';

function parseNumberInput(value: string) {
  return Number(value.trim().replace(',', '.'));
}

function toShortDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return isoDate.slice(0, 10);
  return `${day}/${month}`;
}

export default function ProgressScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const exercises = useExercisesWithHistory();
  const [mode, setMode] = useState<ProgressMode>('exercises');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const effectiveSelectedId = selectedId ?? exercises[0]?.id ?? null;
  const selectedExercise = exercises.find((exercise) => exercise.id === effectiveSelectedId) ?? null;

  const { maxWeightPoints, volumePoints } = useProgressData(effectiveSelectedId ?? '');
  const bodyWeightEntries = useBodyWeightStore((s) => s.entries);
  const addBodyWeightEntry = useBodyWeightStore((s) => s.addEntry);
  const targetWeight = useNutritionGoalsStore((s) => s.goals.targetWeight);
  const sessions = useSessionStore((s) => s.sessions);
  const performanceSex = usePerformanceStore((s) => s.sex);
  const weeklyGoal = usePerformanceStore((s) => s.weeklySessionGoal);
  const monthlyGoal = usePerformanceStore((s) => s.monthlySessionGoal);
  const unlockedBadges = usePerformanceStore((s) => s.unlockedBadges);
  const unlockBadges = usePerformanceStore((s) => s.unlockBadges);

  const performanceAnalyses = useMemo(
    () => exercises.map((exercise) => analyzeExercisePerformance({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sessions,
      bodyweightEntries: bodyWeightEntries,
      sex: performanceSex,
    })),
    [bodyWeightEntries, exercises, performanceSex, sessions]
  );
  const selectedPerformance = performanceAnalyses.find(
    (analysis) => analysis.exerciseId === effectiveSelectedId
  );
  const consistency = useMemo(
    () => calculateConsistencyMetrics(sessions, weeklyGoal, monthlyGoal),
    [monthlyGoal, sessions, weeklyGoal]
  );
  const badgeMetrics = useMemo(
    () => createBadgeMetrics(consistency, performanceAnalyses),
    [consistency, performanceAnalyses]
  );

  useEffect(() => {
    const newBadgeIds = evaluateBadgeUnlocks(
      badgeMetrics,
      unlockedBadges.map((badge) => badge.id)
    );
    if (newBadgeIds.length > 0) unlockBadges(newBadgeIds);
  }, [badgeMetrics, unlockBadges, unlockedBadges]);

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return exercises;
    return exercises.filter((exercise) =>
      exercise.name.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [exercises, query]);

  const bestWeight = useMemo(
    () => maxWeightPoints.reduce((best, point) => Math.max(best, point.value), 0),
    [maxWeightPoints]
  );
  const latestWeight = maxWeightPoints.at(-1)?.value ?? 0;

  const parsedWeight = parseNumberInput(weightInput);
  const canSaveWeight = weightInput.trim().length > 0 && Number.isFinite(parsedWeight) && parsedWeight >= 0;

  const bodyWeightPoints = useMemo<DataPoint[]>(
    () =>
      [...bodyWeightEntries]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((entry) => ({
          date: entry.date.slice(0, 10),
          label: toShortDateLabel(entry.date),
          value: entry.weight,
        })),
    [bodyWeightEntries]
  );

  const currentWeight = bodyWeightPoints.at(-1)?.value ?? null;

  const handleSaveWeight = () => {
    if (!canSaveWeight) return;
    addBodyWeightEntry(parsedWeight);
    setWeightInput('');
  };

  const selectExercise = (exerciseId: string) => {
    setSelectedId(exerciseId);
    setSelectorOpen(false);
    setQuery('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerKicker}>{t('nav.progress')}</Text>
        <Text style={styles.headerTitle}>{t('progress.title')}</Text>
      </View>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, mode === 'exercises' && styles.tabSelected]}
          onPress={() => setMode('exercises')}
          activeOpacity={0.75}
          accessibilityRole="button">
          <Text
            numberOfLines={1}
            style={[styles.tabText, mode === 'exercises' && styles.tabTextSelected]}>
            {t('progress.exercises')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'bodyWeight' && styles.tabSelected]}
          onPress={() => setMode('bodyWeight')}
          activeOpacity={0.75}
          accessibilityRole="button">
          <Text
            numberOfLines={1}
            style={[styles.tabText, mode === 'bodyWeight' && styles.tabTextSelected]}>
            {t('progress.bodyWeight')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'performance' && styles.tabSelected]}
          onPress={() => setMode('performance')}
          activeOpacity={0.75}
          accessibilityRole="button">
          <Text
            numberOfLines={1}
            style={[styles.tabText, mode === 'performance' && styles.tabTextSelected]}>
            {t('progress.performance')}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.currentWeightBlock}>
        <Text style={styles.currentWeightLabel}>{t('progress.currentWeight')}</Text>
        <Text style={styles.currentWeightValue}>
          {currentWeight === null ? '—' : (
            <>
              {currentWeight}
              <Text style={styles.currentWeightUnit}> kg</Text>
            </>
          )}
        </Text>
      </View>

      {mode === 'exercises' ? (
        exercises.length === 0 ? (
          <EmptyState
            icon="trending-up-outline"
            title={t('progress.noData')}
            subtitle={t('progress.noDataHelp')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <TouchableOpacity
              style={styles.exerciseSelector}
              onPress={() => setSelectorOpen(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('progress.chooseExercise')}>
              <View style={styles.selectorIcon}>
                <Ionicons name="barbell" size={21} color={c.primary} />
              </View>
              <View style={styles.selectorCopy}>
                <Text style={styles.selectorLabel}>{t('progress.followedExercise')}</Text>
                <Text style={styles.selectorValue} numberOfLines={1}>
                  {selectedExercise?.name}
                </Text>
                <Text style={styles.selectorMeta}>
                  {t('progress.sessionCount', { count: selectedExercise?.sessionCount ?? 0 })}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={21} color={c.textMuted} />
            </TouchableOpacity>

            {maxWeightPoints.length > 0 ? (
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>{t('progress.latestWeight')}</Text>
                  <Text style={styles.statValue}>{latestWeight} kg</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>{t('progress.personalBest')}</Text>
                  <Text style={styles.statValue}>{bestWeight} kg</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.chartCard}>
              <WeightChart data={maxWeightPoints} />
            </View>
            <View style={styles.chartCard}>
              <VolumeChart data={volumePoints} />
            </View>
            {maxWeightPoints.length === 0 ? (
              <Text style={styles.hint}>{t('progress.exerciseHint')}</Text>
            ) : null}
          </ScrollView>
        )
      ) : mode === 'bodyWeight' ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formRow}>
            <View style={styles.weightInput}>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="numeric"
                placeholder={t('progress.weightPlaceholder')}
              />
            </View>
            <Button
              title={t('common.save')}
              onPress={handleSaveWeight}
              disabled={!canSaveWeight}
              style={styles.saveButton}
            />
          </View>

          {bodyWeightPoints.length === 0 ? (
            <View style={styles.chartCard}>
              <Text style={styles.emptyWeightText}>{t('progress.firstWeight')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.chartCard}>
                <WeightChart data={bodyWeightPoints} title={t('progress.bodyWeightChart')} />
              </View>
              {targetWeight !== undefined ? (
                <Text style={styles.hint}>
                  {t('progress.targetWeight', { weight: targetWeight })}
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <PerformanceDashboard
            analysis={selectedPerformance}
            consistency={consistency}
            unlockedBadges={unlockedBadges}
            onChooseExercise={() => setSelectorOpen(true)}
          />
        </ScrollView>
      )}

      <Modal
        visible={selectorOpen}
        animationType="slide"
        onRequestClose={() => setSelectorOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderSpacer} />
            <Text style={styles.modalTitle}>{t('progress.chooseExercise')}</Text>
            <TouchableOpacity
              onPress={() => setSelectorOpen(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}>
              <Ionicons name="close" size={24} color={c.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('progress.searchExercise')}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.exerciseList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.id === effectiveSelectedId;
              return (
                <TouchableOpacity
                  style={[styles.exerciseOption, active ? styles.exerciseOptionActive : null]}
                  onPress={() => selectExercise(item.id)}
                  activeOpacity={0.75}>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionName}>{item.name}</Text>
                    <Text style={styles.optionMeta}>
                      {t('progress.sessionCount', { count: item.sessionCount })}
                    </Text>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={23} color={c.primary} /> : null}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.noResult}>{t('progress.noExerciseResult')}</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: c.border,
  },
  headerKicker: {
    fontFamily: fonts.serifBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
    color: c.secondary,
  },
  headerTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 34,
    lineHeight: 40,
    marginTop: 6,
    color: c.textPrimary,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: c.border,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: c.border,
  },
  tabSelected: { backgroundColor: c.primary },
  tabText: {
    fontFamily: fonts.serifBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.66,
    textTransform: 'uppercase',
    textAlign: 'left',
    color: c.textPrimary,
  },
  tabTextSelected: { color: c.bg },
  currentWeightBlock: {
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  currentWeightLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  currentWeightValue: {
    fontFamily: fonts.displayHeavy,
    fontSize: 52,
    lineHeight: 47,
    marginTop: 6,
    color: c.textPrimary,
  },
  currentWeightUnit: {
    fontSize: 20,
    color: c.textPrimary,
  },
  content: { paddingHorizontal: spacing.md, gap: spacing.md, paddingBottom: 32 },
  exerciseSelector: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    ...cardShadow(c),
  },
  selectorIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  selectorCopy: { flex: 1, minWidth: 0, gap: 1 },
  selectorLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: fonts.sansBold,
    color: c.textMuted,
    textTransform: 'uppercase',
  },
  selectorValue: { fontSize: 17, fontFamily: fonts.sansBold, color: c.textPrimary },
  selectorMeta: { fontSize: 12, fontFamily: fonts.sans, color: c.textSecondary },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    padding: 13,
    borderRadius: radius.md,
    backgroundColor: c.accentSoft,
  },
  statLabel: { fontSize: 11, fontFamily: fonts.sans, color: c.textSecondary },
  statValue: { marginTop: 2, fontSize: 20, fontFamily: fonts.sansHeavy, color: c.primary },
  formRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  weightInput: { flex: 1, minWidth: 0 },
  saveButton: { minHeight: 48, paddingHorizontal: 14 },
  chartCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...cardShadow(c),
    overflow: 'hidden',
  },
  hint: { fontSize: 13, fontFamily: fonts.sans, color: c.textMuted, textAlign: 'center' },
  emptyWeightText: { fontSize: 14, fontFamily: fonts.sans, color: c.textSecondary, textAlign: 'center' },
  modalSafe: { flex: 1, backgroundColor: c.bg },
  modalHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  modalHeaderSpacer: { width: 24 },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: fonts.sansBold, color: c.textPrimary },
  searchWrap: { padding: spacing.md, paddingBottom: 8 },
  exerciseList: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: 8 },
  exerciseOption: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  exerciseOptionActive: { borderColor: c.primary, backgroundColor: c.accentSoft },
  optionCopy: { flex: 1, gap: 2 },
  optionName: { fontSize: 15, fontFamily: fonts.sansBold, color: c.textPrimary },
  optionMeta: { fontSize: 12, fontFamily: fonts.sans, color: c.textSecondary },
  noResult: { paddingTop: spacing.xl, textAlign: 'center', fontFamily: fonts.sans, color: c.textMuted },
});
