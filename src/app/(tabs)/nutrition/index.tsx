import { useCallback, useMemo, useReducer } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MacroBar } from '../../../components/nutrition/MacroBar';
import { Button } from '../../../components/ui/Button';
import { colors } from '../../../constants/colors';
import {
  calculateDailyTotals,
  calculateGoalProgress,
  calculateRemainingGoals,
} from '../../../lib/nutritionCalc';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatMacro(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

function roundedMacro(value: number) {
  return Number(formatMacro(value).replace(',', '.'));
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
  const progress = useMemo(() => calculateGoalProgress(totals, goals), [goals, totals]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aujourd'hui</Text>

          <View style={styles.caloriesBlock}>
            <Text style={styles.caloriesValue}>
              {totals.calories} / {goals.dailyCalories} kcal
            </Text>
            <Text style={[styles.remaining, remaining.calories < 0 ? styles.overGoal : null]}>
              {remaining.calories >= 0
                ? `Restant : ${remaining.calories} kcal`
                : `Dépassé de ${Math.abs(remaining.calories)} kcal`}
            </Text>
          </View>

          <MacroBar
            label="Calories"
            current={totals.calories}
            goal={goals.dailyCalories}
            unit="kcal"
            percent={progress.calories}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Macros</Text>

          <View style={styles.macroBars}>
            <MacroBar
              label="Protéines"
              current={roundedMacro(totals.protein)}
              goal={roundedMacro(goals.protein)}
              unit="g"
              percent={progress.protein}
            />
            <MacroBar
              label="Glucides"
              current={roundedMacro(totals.carbs)}
              goal={roundedMacro(goals.carbs)}
              unit="g"
              percent={progress.carbs}
            />
            <MacroBar
              label="Lipides"
              current={roundedMacro(totals.fat)}
              goal={roundedMacro(goals.fat)}
              unit="g"
              percent={progress.fat}
            />
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
  card: {
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
  overGoal: { color: colors.danger },
  macroBars: { gap: 14 },
  actions: { gap: 12 },
});
