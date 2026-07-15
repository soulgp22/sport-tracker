import { useCallback, useMemo, useReducer, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalorieTrendChart } from '../../../components/nutrition/CalorieTrendChart';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { getCalorieTrend } from '../../../lib/nutritionCalc';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';

const periods = [
  { label: '7 j', days: 7, bucket: 'day' },
  { label: '30 j', days: 30, bucket: 'day' },
  { label: '3 mois', days: 90, bucket: 'week' },
  { label: '1 an', days: 365, bucket: 'month' },
] as const;

type Period = (typeof periods)[number];

export default function NutritionHistoryScreen() {
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
        <Text style={styles.heading}>Tendance calories</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.periodRow}>
          {periods.map((item) => {
            const selected = item.label === selectedPeriod.label;

            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setSelectedPeriod(item)}
                activeOpacity={0.75}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Moyenne</Text>
            <Text style={styles.statValue}>{trend.averagePerDay} kcal/j</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Objectif</Text>
            <Text style={styles.statValue}>{goals.dailyCalories} kcal/j</Text>
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
  heading: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
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
  chipText: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
  chipTextSelected: { color: c.primaryText },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 6,
  },
  statLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
  statValue: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
  chartCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
  },
});
