import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WeightTrend } from '../../components/progress/WeightTrend';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { estimateActiveCaloriesFromSteps, resolveDailyEnergyExpenditure } from '../../lib/energyBalance';
import { calculateDailyTotals } from '../../lib/nutritionCalc';
import { getBodyweightForDate } from '../../lib/performanceEngine';
import { useTranslation } from '../../i18n/useTranslation';
import { useActiveSessionStore } from '../../store/activeSessionStore';
import { useBodyWeightStore } from '../../store/bodyWeightStore';
import { useFoodDiaryStore } from '../../store/foodDiaryStore';
import { useNutritionGoalsStore } from '../../store/nutritionGoalsStore';
import { usePerformanceStore } from '../../store/performanceStore';
import { useSessionStore } from '../../store/sessionStore';
import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import { radius, spacing } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { useHealthToday } from '../../hooks/useHealthToday';


/** Durée de montée des compteurs de l'accueil, en millisecondes. */
const ANIMATION_DURATION_MS = 900;

/** Clé de date ISO du jour, alignée sur le journal alimentaire. */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatHeaderDate(date: Date, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  } catch {
    return date.toLocaleDateString(locale);
  }
}

function formatActivityDate(date: Date, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date);
  } catch {
    return date.toLocaleDateString(locale);
  }
}

function formatInteger(value: number, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}

/** Numéro de semaine ISO 8601 (lundi = premier jour de la semaine). */
function isoWeekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default function HomeScreen() {
  const c = useColors();
  const { t, locale } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const firstName = usePerformanceStore((s) => s.firstName);
  const sex = usePerformanceStore((s) => s.sex);
  const age = usePerformanceStore((s) => s.age);
  const heightCm = usePerformanceStore((s) => s.heightCm);
  const activityLevel = usePerformanceStore((s) => s.activityLevel);
  const weightEntries = useBodyWeightStore((s) => s.entries);
  const goals = useNutritionGoalsStore((s) => s.goals);
  const entriesState = useFoodDiaryStore((s) => s.entries);
  const sessions = useSessionStore((s) => s.sessions);
  const active = useActiveSessionStore((s) => s.active);

  const totals = useMemo(() => {
    const key = todayKey();
    return calculateDailyTotals(
      entriesState.filter((entry) => entry.date.slice(0, 10) === key)
    );
  }, [entriesState]);
  const { healthData } = useHealthToday();
  const healthSteps = healthData.status === 'granted' ? healthData.steps : null;

  const weightKg = getBodyweightForDate(weightEntries, new Date().toISOString());
  const steps = healthSteps !== null && healthSteps > 0 ? healthSteps : null;
  const stepsCalories =
    steps !== null && weightKg !== undefined
      ? estimateActiveCaloriesFromSteps(steps, weightKg).activeCaloriesKcal
      : null;

  const expenditure = resolveDailyEnergyExpenditure({
    healthCalories: null,
    healthSteps,
    profile: { sex, weightKg, heightCm, ageYears: age, activityLevel },
  });

  const consumed = totals.calories;
  const goal = goals.dailyCalories;
  const burned = expenditure.activityKcal;
  const progress = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const remaining = burned !== null ? goal - consumed + burned : null;

  const now = new Date();
  const dateLabel = formatHeaderDate(now, locale);
  const weekLabel = t('home.week', { week: isoWeekNumber(now) });
  const greeting = firstName ? t('home.greetingName', { name: firstName }) : t('home.greeting');
  const recentSessions = sessions.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. En-tête */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.dateKicker}>{dateLabel}</Text>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
          </View>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        {/* 2. Deux colonnes chiffrées */}
        <View style={styles.columns}>
          <View style={[styles.column, styles.columnDivider]}>
            <Text style={styles.columnLabel}>{t('home.calories')}</Text>
            <AnimatedNumber
              value={consumed}
              duration={ANIMATION_DURATION_MS}
              format={(v) => formatInteger(Math.round(v), locale)}
              style={styles.bigNumber}
              testID="home-calories-value"
            />
            <Text style={styles.columnHint}>
              {t('home.caloriesGoal', { goal: formatInteger(goal, locale) })}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: progress }]} />
            </View>
          </View>
          <View style={styles.column}>
            <Text style={styles.columnLabel}>{t('home.remaining')}</Text>
            {remaining !== null ? (
              <AnimatedNumber
                value={remaining}
                duration={ANIMATION_DURATION_MS}
                format={(v) => formatInteger(Math.round(v), locale)}
                style={styles.bigNumber}
              />
            ) : (
              <Text style={styles.bigNumber}>—</Text>
            )}
            <Text style={styles.columnHint}>
              {burned !== null
                ? t('home.burnedKcal', { kcal: formatInteger(burned, locale) })
                : t('home.completeProfileHint')}
            </Text>
            <View style={styles.segments}>
              <View style={[styles.segment, { backgroundColor: c.tertiary }]} />
              <View style={[styles.segment, { backgroundColor: c.border }]} />
              <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]} />
            </View>
          </View>
        </View>

        {/* Poids actuel */}
        <TouchableOpacity
          style={styles.weightBand}
          onPress={() => router.push('/(tabs)/progress?tab=bodyWeight' as never)}
          activeOpacity={0.78}
          accessibilityRole="button"
          accessibilityLabel={t('progress.currentWeight')}>
          <Text style={styles.weightBandLabel}>{t('progress.currentWeight')}</Text>
          <View style={styles.weightBandGroup}>
            <WeightTrend entries={weightEntries} />
            {weightKg === undefined ? (
              <Text style={styles.weightBandValue} testID="home-weight-value">—</Text>
            ) : (
              <AnimatedNumber
                value={weightKg}
                duration={ANIMATION_DURATION_MS}
                format={(v) => String(Math.round(v * 10) / 10)}
                style={styles.weightBandValue}
                testID="home-weight-value">
                <Text style={styles.weightBandUnit}> kg</Text>
              </AnimatedNumber>
            )}
            {steps !== null ? (
              <>
                <AnimatedNumber
                  value={steps}
                  duration={ANIMATION_DURATION_MS}
                  format={(v) => String(Math.round(v))}
                  style={styles.weightBandMetaValue}
                  testID="home-steps-value">
                  <Text style={styles.weightBandMetaUnit}> {t('home.steps')}</Text>
                </AnimatedNumber>
                {stepsCalories !== null ? (
                  <AnimatedNumber
                    value={stepsCalories}
                    duration={ANIMATION_DURATION_MS}
                    format={(v) => String(Math.round(v))}
                    style={styles.weightBandMetaValue}
                    testID="home-steps-calories-value">
                    <Text style={styles.weightBandMetaUnit}> kcal</Text>
                  </AnimatedNumber>
                ) : null}
              </>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* 3. Action principale */}
        <View style={styles.actionWrap}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/session')}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={active ? t('home.resumeSession') : t('home.startSession')}>
            <Text style={styles.actionKicker}>
              {active ? t('home.activeSession') : t('home.nextEffort')}
            </Text>
            <Text style={styles.actionTitle}>
              {active ? t('home.resumeSession') : t('home.startSession')}
            </Text>
            <Text style={styles.actionSubtitle} numberOfLines={1}>
              {active ? `${active.programName} · ${active.dayName}` : t('home.chooseProgram')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Deux raccourcis */}
        <View style={styles.shortcuts}>
          <TouchableOpacity
            style={[styles.shortcut, styles.shortcutDivider]}
            onPress={() => router.push('/(tabs)/nutrition/photo' as never)}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={t('home.analyzeMeal')}>
            <Text style={styles.shortcutTitle}>{t('home.analyzeMeal')}</Text>
            <Text style={styles.shortcutSubtitle}>{t('home.analyzeMealSubtitle')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcut}
            onPress={() => router.push('/(tabs)/nutrition' as never)}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={t('home.calorieTracking')}>
            <Text style={styles.shortcutTitle}>{t('home.calorieTracking')}</Text>
            <Text style={styles.shortcutSubtitle}>{t('home.calorieTrackingSubtitle')}</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Dernière activité */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>{t('home.lastActivity')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/history' as never)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('nav.history')}>
              <Text style={styles.historyLink}>{t('nav.history')}</Text>
            </TouchableOpacity>
          </View>
          {recentSessions.length === 0 ? (
            <Text style={styles.emptyActivity}>{t('history.emptyTitle')}</Text>
          ) : (
            recentSessions.map((session) => {
              const title = session.programName ?? t('history.freeSession');
              const meta = session.dayName;
              const when = formatActivityDate(new Date(session.date), locale);
              return (
                <View key={session.id} style={styles.activityRow}>
                  <View style={styles.activityCopy}>
                    <Text style={styles.activityRowTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    {meta ? (
                      <Text style={styles.activityRowMeta} numberOfLines={1}>
                        {meta}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.activityRowWhen}>{when}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingBottom: spacing.lg },

    header: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 14,
      borderBottomWidth: 2,
      borderBottomColor: c.border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    dateKicker: {
      fontFamily: fonts.serifBold,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 1.54,
      textTransform: 'uppercase',
      color: c.secondary,
    },
    weekLabel: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.66,
      textTransform: 'uppercase',
      color: c.textMuted,
    },
    greeting: {
      fontFamily: fonts.serifBold,
      fontSize: 34,
      lineHeight: 40,
      marginTop: 6,
      color: c.textPrimary,
    },

    columns: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: c.border,
    },
    column: { flex: 1, paddingHorizontal: 20, paddingVertical: 16 },
    columnDivider: { borderRightWidth: 1, borderRightColor: c.border },
    columnLabel: {
      fontFamily: fonts.sans,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: c.textMuted,
    },
    bigNumber: {
      fontFamily: fonts.displayHeavy,
      fontSize: 40,
      lineHeight: 40,
      marginTop: 4,
      color: c.textPrimary,
    },
    columnHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 4,
      color: c.textSecondary,
    },
    progressTrack: {
      height: 6,
      marginTop: 10,
      flexDirection: 'row',
      overflow: 'hidden',
      borderRadius: radius.pill,
      backgroundColor: c.surfaceAlt,
    },
    progressFill: { height: 6, borderRadius: radius.pill, backgroundColor: c.tertiary },
    segments: { flexDirection: 'row', gap: 4, marginTop: 10 },
    segment: { flex: 1, height: 6, borderRadius: radius.pill },

    weightBand: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 2,
      borderBottomColor: c.border,
      minHeight: 48,
    },
    weightBandLabel: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.66,
      textTransform: 'uppercase',
      color: c.textMuted,
    },
    weightBandValue: {
      fontFamily: fonts.displayHeavy,
      fontSize: 24,
      color: c.textPrimary,
    },
    weightBandUnit: {
      fontSize: 12,
      color: c.textSecondary,
    },
    weightBandMetaValue: {
      fontFamily: fonts.sansBold,
      fontSize: 12,
      color: c.textSecondary,
    },
    weightBandMetaUnit: {
      fontSize: 10,
      color: c.textMuted,
    },
    weightBandGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },

    actionWrap: { padding: 20 },
    actionButton: {
      minHeight: 96,
      paddingHorizontal: 20,
      paddingVertical: 18,
      justifyContent: 'center',
      gap: 6,
      borderRadius: radius.lg,
      backgroundColor: c.primary,
    },
    actionKicker: {
      fontFamily: fonts.sans,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: c.primaryText,
      opacity: 0.85,
    },
    actionTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 28,
      lineHeight: 30,
      letterSpacing: -0.42,
      color: c.primaryText,
    },
    actionSubtitle: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: c.primaryText,
      opacity: 0.85,
    },

    shortcuts: {
      flexDirection: 'row',
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderColor: c.border,
    },
    shortcut: {
      flex: 1,
      minHeight: 88,
      paddingHorizontal: 20,
      paddingVertical: 18,
      justifyContent: 'center',
    },
    shortcutDivider: { borderRightWidth: 1, borderRightColor: c.border },
    shortcutTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 16,
      lineHeight: 20,
      color: c.textPrimary,
    },
    shortcutSubtitle: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 4,
      color: c.textSecondary,
    },

    activitySection: { flex: 1 },
    activityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 8,
    },
    activityTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 16,
      lineHeight: 20,
      color: c.textPrimary,
    },
    historyLink: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.88,
      textTransform: 'uppercase',
      color: c.primary,
    },
    activityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    activityCopy: { flex: 1, minWidth: 0 },
    activityRowTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 14,
      lineHeight: 18,
      color: c.textPrimary,
    },
    activityRowMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 2,
      color: c.textMuted,
    },
    activityRowWhen: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.66,
      textTransform: 'uppercase',
      color: c.textMuted,
    },
    emptyActivity: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      paddingHorizontal: 20,
      paddingVertical: 13,
      color: c.textMuted,
    },
  });
