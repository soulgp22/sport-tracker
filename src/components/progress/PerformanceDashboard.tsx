import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  getBadgeDefinitions,
  getPerformanceReferenceMetadata,
} from '../../lib/performanceEngine';
import { usePerformanceStore } from '../../store/performanceStore';
import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import { useColors } from '../../theme/useColors';
import { useTranslation } from '../../i18n/useTranslation';
import type {
  ConsistencyMetrics,
  ExercisePerformanceAnalysis,
  UnlockedBadge,
} from '../../types/performance';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface PerformanceDashboardProps {
  analysis?: ExercisePerformanceAnalysis;
  consistency: ConsistencyMetrics;
  unlockedBadges: UnlockedBadge[];
  onChooseExercise: () => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(value));
}

export function PerformanceDashboard({
  analysis,
  consistency,
  unlockedBadges,
  onChooseExercise,
}: PerformanceDashboardProps) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const sex = usePerformanceStore((state) => state.sex);
  const weeklyGoal = usePerformanceStore((state) => state.weeklySessionGoal);
  const monthlyGoal = usePerformanceStore((state) => state.monthlySessionGoal);
  const unlockedIds = useMemo(
    () => new Set(unlockedBadges.map((badge) => badge.id)),
    [unlockedBadges]
  );
  const badges = getBadgeDefinitions();
  const reference = getPerformanceReferenceMetadata();
  const percentile = analysis?.percentile;
  const progressToNext = percentile?.nextRatio
    ? Math.min(1, percentile.ratio / percentile.nextRatio)
    : 1;

  return (
    <View style={styles.root}>
      <View style={styles.goalGrid}>
        <View style={styles.goalCard}>
          <View style={[styles.goalIcon, { backgroundColor: '#F973161A' }]}>
            <Ionicons name="flame" size={19} color="#F97316" />
          </View>
          <Text style={styles.goalValue}>{consistency.weeklyStreak}</Text>
          <Text style={styles.goalLabel}>{t('performance.weekStreak')}</Text>
        </View>
        <View style={styles.goalCard}>
          <View style={[styles.goalIcon, { backgroundColor: '#2563EB1A' }]}>
            <Ionicons name="calendar" size={19} color="#2563EB" />
          </View>
          <Text style={styles.goalValue}>{consistency.thisWeek}/{weeklyGoal}</Text>
          <Text style={styles.goalLabel}>{t('performance.thisWeek')}</Text>
        </View>
        <View style={styles.goalCard}>
          <View style={[styles.goalIcon, { backgroundColor: '#10B9811A' }]}>
            <Ionicons name="flag" size={19} color="#10B981" />
          </View>
          <Text style={styles.goalValue}>{consistency.thisMonth}/{monthlyGoal}</Text>
          <Text style={styles.goalLabel}>{t('performance.thisMonth')}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.exerciseSelector}
        onPress={onChooseExercise}
        activeOpacity={0.75}
        accessibilityRole="button">
        <View style={styles.selectorIcon}>
          <Ionicons name="barbell" size={21} color={c.primary} />
        </View>
        <View style={styles.selectorCopy}>
          <Text style={styles.selectorLabel}>{t('performance.analyzedExercise')}</Text>
          <Text style={styles.selectorValue} numberOfLines={1}>
            {analysis?.exerciseName ?? t('progress.chooseExercise')}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={21} color={c.textMuted} />
      </TouchableOpacity>

      {analysis?.best ? (
        <>
          <View style={styles.performanceHero}>
            <View style={styles.heroHeader}>
              <View>
                <Text style={styles.heroEyebrow}>{t('performance.estimatedOneRm')}</Text>
                <Text style={styles.heroValue}>{analysis.best.estimatedOneRepMaxKg} kg</Text>
              </View>
              <View style={styles.confidencePill}>
                <Text style={styles.confidenceText}>
                  {t(`performance.confidence.${analysis.confidence ?? 'low'}`)}
                </Text>
              </View>
            </View>
            <Text style={styles.heroFormula}>
              {analysis.best.weightKg} kg × {analysis.best.reps} · Epley + Brzycki
            </Text>
          </View>

          {sex === 'unspecified' || !analysis.bodyweightKg ? (
            <View style={styles.setupCard}>
              <Ionicons name="person-circle-outline" size={27} color={c.primary} />
              <View style={styles.setupCopy}>
                <Text style={styles.setupTitle}>{t('performance.completeProfile')}</Text>
                <Text style={styles.setupText}>{t('performance.completeProfileHelp')}</Text>
              </View>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={() => router.push('/(tabs)/settings')}>
                <Ionicons name="arrow-forward" size={18} color={c.primaryText} />
              </TouchableOpacity>
            </View>
          ) : percentile ? (
            <View style={styles.rankCard}>
              <View style={styles.rankHeader}>
                <View style={[styles.rankMedal, { backgroundColor: `${percentile.level.color}1F` }]}>
                  <Ionicons name="trophy" size={23} color={percentile.level.color} />
                </View>
                <View style={styles.rankCopy}>
                  <Text style={styles.rankEstimate}>{t('performance.referenceEstimate')}</Text>
                  <Text style={[styles.rankLevel, { color: percentile.level.color }]}>
                    {t(`performance.level.${percentile.level.id}`)}
                  </Text>
                </View>
                <View style={styles.percentilePill}>
                  <Text style={styles.percentileValue}>Top {percentile.topPercent} %</Text>
                </View>
              </View>

              <View style={styles.ratioRow}>
                <Text style={styles.ratioLabel}>{t('performance.strengthRatio')}</Text>
                <Text style={styles.ratioValue}>{percentile.ratio}×</Text>
              </View>

              {percentile.nextLevel && percentile.kgToNextLevel !== undefined ? (
                <View style={styles.nextBlock}>
                  <View style={styles.nextHeader}>
                    <Text style={styles.nextLabel}>
                      {t('performance.nextLevel')}: {t(`performance.level.${percentile.nextLevel.id}`)}
                    </Text>
                    <Text style={styles.nextKg}>+{percentile.kgToNextLevel} kg</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(progressToNext * 100)}%` }]} />
                  </View>
                </View>
              ) : null}

              <Text style={styles.referenceNote}>
                {t('performance.referenceNote', {
                  sample: percentile.sampleSize.toLocaleString(),
                  date: reference.datasetDate ?? '',
                })}
              </Text>
            </View>
          ) : (
            <View style={styles.setupCard}>
              <Ionicons name="information-circle-outline" size={27} color={c.primary} />
              <View style={styles.setupCopy}>
                <Text style={styles.setupTitle}>{t('performance.noReference')}</Text>
                <Text style={styles.setupText}>{t('performance.noReferenceHelp')}</Text>
              </View>
            </View>
          )}
        </>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('performance.badges')}</Text>
        <Text style={styles.sectionMeta}>{unlockedBadges.length}/{badges.length}</Text>
      </View>
      <View style={styles.badgeGrid}>
        {badges.map((badge) => {
          const unlocked = unlockedIds.has(badge.id);
          return (
            <View key={badge.id} style={[styles.badgeCard, unlocked ? styles.badgeCardUnlocked : null]}>
              <View style={[styles.badgeIcon, unlocked ? styles.badgeIconUnlocked : null]}>
                <Ionicons
                  name={badge.icon as IoniconsName}
                  size={20}
                  color={unlocked ? c.primary : c.textMuted}
                />
              </View>
              <Text style={[styles.badgeName, !unlocked ? styles.badgeNameLocked : null]} numberOfLines={2}>
                {t(badge.labelKey ?? badge.label)}
              </Text>
              <Ionicons
                name={unlocked ? 'checkmark-circle' : 'lock-closed-outline'}
                size={14}
                color={unlocked ? c.success : c.textMuted}
              />
            </View>
          );
        })}
      </View>

      {analysis?.records.length ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('performance.records')}</Text>
            <Text style={styles.sectionMeta}>{analysis.records.length}</Text>
          </View>
          <View style={styles.recordsCard}>
            {[...analysis.records].reverse().slice(0, 6).map((record, index) => (
              <View key={`${record.date}-${record.estimatedOneRepMaxKg}`} style={[styles.recordRow, index > 0 ? styles.recordBorder : null]}>
                <View style={styles.recordIcon}>
                  <Ionicons name="trending-up" size={16} color={c.primary} />
                </View>
                <View style={styles.recordCopy}>
                  <Text style={styles.recordValue}>{record.estimatedOneRepMaxKg} kg</Text>
                  <Text style={styles.recordMeta}>{record.weightKg} kg × {record.reps} · {formatDate(record.date)}</Text>
                </View>
                {record.improvementPct ? (
                  <Text style={styles.recordGain}>+{record.improvementPct} %</Text>
                ) : null}
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { gap: 14 },
  goalGrid: { flexDirection: 'row', gap: 8 },
  goalCard: { flex: 1, minWidth: 0, padding: 11, borderRadius: 15, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  goalIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  goalValue: { fontSize: 18, fontFamily: fonts.sansHeavy, color: c.textPrimary },
  goalLabel: { fontSize: 9.5, fontFamily: fonts.sans, color: c.textMuted },
  exerciseSelector: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 17, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  selectorIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
  selectorCopy: { flex: 1, minWidth: 0, gap: 2 },
  selectorLabel: { fontSize: 9, letterSpacing: 1, fontFamily: fonts.sansBold, color: c.textMuted, textTransform: 'uppercase' },
  selectorValue: { fontSize: 15, fontFamily: fonts.sansBold, color: c.textPrimary },
  performanceHero: { padding: 16, borderRadius: 18, backgroundColor: c.primary },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  heroEyebrow: { fontSize: 10, letterSpacing: 1, fontFamily: fonts.sansBold, color: c.primaryText, opacity: 0.75, textTransform: 'uppercase' },
  heroValue: { marginTop: 2, fontSize: 30, fontFamily: fonts.sansHeavy, color: c.primaryText },
  confidencePill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)' },
  confidenceText: { fontSize: 10, fontFamily: fonts.sansBold, color: c.primaryText },
  heroFormula: { marginTop: 8, fontSize: 12, fontFamily: fonts.sans, color: c.primaryText, opacity: 0.78 },
  setupCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 17, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  setupCopy: { flex: 1, gap: 2 },
  setupTitle: { fontSize: 14, fontFamily: fonts.sansBold, color: c.textPrimary },
  setupText: { fontSize: 11, lineHeight: 16, fontFamily: fonts.sans, color: c.textSecondary },
  setupButton: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary },
  rankCard: { padding: 15, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  rankHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rankMedal: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rankCopy: { flex: 1, minWidth: 0 },
  rankEstimate: { fontSize: 9, letterSpacing: 0.8, fontFamily: fonts.sansBold, color: c.textMuted, textTransform: 'uppercase' },
  rankLevel: { fontSize: 19, fontFamily: fonts.sansHeavy },
  percentilePill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: c.accentSoft },
  percentileValue: { fontSize: 11, fontFamily: fonts.sansBold, color: c.primary },
  ratioRow: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border, flexDirection: 'row', justifyContent: 'space-between' },
  ratioLabel: { fontSize: 12, fontFamily: fonts.sans, color: c.textSecondary },
  ratioValue: { fontSize: 14, fontFamily: fonts.sansBold, color: c.textPrimary },
  nextBlock: { marginTop: 12, gap: 7 },
  nextHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  nextLabel: { flex: 1, fontSize: 11, fontFamily: fonts.sansSemi, color: c.textSecondary },
  nextKg: { fontSize: 11, fontFamily: fonts.sansBold, color: c.primary },
  progressTrack: { height: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: c.surfaceAlt },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: c.primary },
  referenceNote: { marginTop: 12, fontSize: 9.5, lineHeight: 14, fontFamily: fonts.sans, color: c.textMuted },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontFamily: fonts.sansHeavy, color: c.textPrimary },
  sectionMeta: { fontSize: 11, fontFamily: fonts.sansBold, color: c.textMuted },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: { width: '31.5%', minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, borderRadius: 15, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, opacity: 0.65 },
  badgeCardUnlocked: { backgroundColor: c.surface, borderColor: c.primary, opacity: 1 },
  badgeIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
  badgeIconUnlocked: { backgroundColor: c.accentSoft },
  badgeName: { minHeight: 28, textAlign: 'center', fontSize: 10, lineHeight: 13, fontFamily: fonts.sansBold, color: c.textPrimary },
  badgeNameLocked: { color: c.textMuted },
  recordsCard: { borderRadius: 17, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, overflow: 'hidden' },
  recordRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9 },
  recordBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  recordIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
  recordCopy: { flex: 1, gap: 2 },
  recordValue: { fontSize: 14, fontFamily: fonts.sansBold, color: c.textPrimary },
  recordMeta: { fontSize: 10, fontFamily: fonts.sans, color: c.textMuted },
  recordGain: { fontSize: 11, fontFamily: fonts.sansBold, color: c.success },
});
