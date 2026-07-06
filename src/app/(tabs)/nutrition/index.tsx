import { useCallback, useMemo, useReducer } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../components/ui/Button';
import { colors } from '../../../constants/colors';
import { calculateDailyTotals, calculateRemainingGoals } from '../../../lib/nutritionCalc';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatMacro(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

export default function NutritionScreen() {
  const router = useRouter();
  const [, forceTick] = useReducer((x: number) => x + 1, 0);
  const goals = useNutritionGoalsStore((s) => s.goals);
  const entriesState = useFoodDiaryStore((s) => s.entries);
  const getEntriesByDate = useFoodDiaryStore((s) => s.getEntriesByDate);

  useFocusEffect(
    useCallback(() => {
      forceTick();
    }, [])
  );

  const today = todayKey();
  const entries = useMemo(
    () => getEntriesByDate(today),
    [entriesState, getEntriesByDate, today]
  );
  const totals = useMemo(() => calculateDailyTotals(entries), [entries]);
  const remaining = useMemo(() => calculateRemainingGoals(totals, goals), [goals, totals]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Aujourd'hui</Text>

          <View style={styles.caloriesBlock}>
            <Text style={styles.caloriesValue}>
              {totals.calories} / {goals.dailyCalories} kcal
            </Text>
            <Text style={styles.remaining}>Restant: {remaining.calories} kcal</Text>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroCell}>
              <Text style={styles.macroValue}>
                P {formatMacro(totals.protein)}/{formatMacro(goals.protein)} g
              </Text>
              <Text style={styles.macroLabel}>Protéines</Text>
            </View>
            <View style={styles.macroCell}>
              <Text style={styles.macroValue}>
                G {formatMacro(totals.carbs)}/{formatMacro(goals.carbs)} g
              </Text>
              <Text style={styles.macroLabel}>Glucides</Text>
            </View>
            <View style={styles.macroCell}>
              <Text style={styles.macroValue}>
                L {formatMacro(totals.fat)}/{formatMacro(goals.fat)} g
              </Text>
              <Text style={styles.macroLabel}>Lipides</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Ajouter un repas"
            onPress={() => router.push('/(tabs)/nutrition/add' as never)}
          />
          <Button
            title="Journal du jour"
            onPress={() => router.push('/(tabs)/nutrition/diary' as never)}
          />
          <Button
            title="Tendance calories"
            variant="secondary"
            onPress={() => router.push('/(tabs)/nutrition/history' as never)}
          />
          <Button
            title="Objectifs"
            variant="secondary"
            onPress={() => router.push('/(tabs)/nutrition/goals' as never)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 18, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  caloriesBlock: { gap: 4 },
  caloriesValue: { fontSize: 28, fontWeight: '800', color: colors.primary },
  remaining: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroCell: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  macroValue: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  macroLabel: { fontSize: 11, color: colors.textSecondary },
  actions: { gap: 12 },
});
