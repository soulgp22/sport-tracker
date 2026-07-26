import { useCallback, useMemo, useReducer, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalorieTrendChart } from '../../../components/nutrition/CalorieTrendChart';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { fonts } from '../../../theme/fonts';
import { getCalorieTrend } from '../../../lib/nutritionCalc';
import { useTranslation } from '../../../i18n/useTranslation';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';

const periods = [
  { labelKey: 'nutrition.history.period7d', days: 7, bucket: 'day' },
  { labelKey: 'nutrition.history.period30d', days: 30, bucket: 'day' },
  { labelKey: 'nutrition.history.period3m', days: 90, bucket: 'week' },
  { labelKey: 'nutrition.history.period1y', days: 365, bucket: 'month' },
] as const;

type Period = (typeof periods)[number];

export default function NutritionHistoryScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [, forceTick] = useReducer((x: number) => x + 1, 0);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(periods[0]);
  const entriesState = useFoodDiaryStore((s) => s.entries);
  const goals = useNutritionGoalsStore((s) => s.goals);

  useFocusEffect(
    useCallback(() => {
      forceTick();
    }, [])
  );

  const trend = useMemo(
    () => getCalorieTrend(entriesState, selectedPeriod.days, selectedPeriod.bucket),
    [entriesState, selectedPeriod]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading}>{t('nutrition.historyTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.periodRow}>
          {periods.map((item) => {
            const selected = item.labelKey === selectedPeriod.labelKey;

            return (
              <TouchableOpacity
                key={item.labelKey}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setSelectedPeriod(item)}
                activeOpacity={0.75}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {t(item.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('nutrition.history.average')}</Text>
            <Text style={styles.statValue}>
              {trend.averagePerDay} {t('nutrition.history.kcalPerDay')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('nutrition.goals.objective')}</Text>
            <Text style={styles.statValue}>
              {goals.dailyCalories} {t('nutrition.history.kcalPerDay')}
            </Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <CalorieTrendChart points={trend.points} goal={goals.dailyCalories} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { fontSize: 18, fontFamily: fonts.sansBold, color: c.textPrimary },
  headerSpacer: { width: 24 },
  content: { padding: 16, gap: 18, paddingBottom: 32 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textPrimary },
  chipTextSelected: { color: c.primaryText },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textSecondary },
  statValue: { fontSize: 20, fontFamily: fonts.sansHeavy, color: c.textPrimary },
  chartCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
});
