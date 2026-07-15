import { useCallback, useMemo, useReducer } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodEntryRow } from '../../../components/nutrition/FoodEntryRow';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { MEAL_LABELS, MEAL_ORDER } from '../../../constants/meals';
import { calculateDailyTotals, calculateNutritionForQuantity } from '../../../lib/nutritionCalc';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useFoodStore } from '../../../store/foodStore';
import type { FoodEntry, MealType } from '../../../types';

type Row =
  | { key: string; kind: 'header'; mealType: MealType }
  | { key: string; kind: 'entry'; entry: FoodEntry };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function NutritionDiaryScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [, forceTick] = useReducer((x: number) => x + 1, 0);
  const entriesState = useFoodDiaryStore((s) => s.entries);
  const getEntriesByDate = useFoodDiaryStore((s) => s.getEntriesByDate);
  const deleteFoodEntry = useFoodDiaryStore((s) => s.deleteFoodEntry);
  const updateFoodEntry = useFoodDiaryStore((s) => s.updateFoodEntry);
  const getFoodById = useFoodStore((s) => s.getFoodById);

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
  const entriesByMeal = useMemo(() => {
    const grouped: Record<MealType, FoodEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };

    for (const entry of entries) {
      grouped[entry.mealType].push(entry);
    }

    return grouped;
  }, [entries]);
  const mealTotals = useMemo(() => {
    const totals = {} as Record<MealType, ReturnType<typeof calculateDailyTotals>>;

    for (const mealType of MEAL_ORDER) {
      totals[mealType] = calculateDailyTotals(entriesByMeal[mealType]);
    }

    return totals;
  }, [entriesByMeal]);
  const rows = useMemo<Row[]>(
    () =>
      MEAL_ORDER.flatMap((mealType) => [
        { key: `h-${mealType}`, kind: 'header' as const, mealType },
        ...entriesByMeal[mealType].map((entry) => ({
          key: entry.id,
          kind: 'entry' as const,
          entry,
        })),
      ]),
    [entriesByMeal]
  );

  const handleDelete = (entry: FoodEntry) => {
    Alert.alert(
      'Supprimer ce repas ?',
      `Supprimer ${entry.foodName} du journal du jour ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteFoodEntry(entry.id),
        },
      ]
    );
  };

  const handleMove = (entry: FoodEntry, mealType: MealType) => {
    updateFoodEntry(entry.id, { mealType });
  };

  const handleUpdateQuantity = (entry: FoodEntry, quantity: number) => {
    const food = getFoodById(entry.foodId);
    if (!food) {
      Alert.alert(
        'Aliment introuvable',
        "Impossible de recalculer cette entrée car l'aliment n'existe plus."
      );
      return;
    }

    updateFoodEntry(entry.id, {
      quantity,
      calculatedNutrition: calculateNutritionForQuantity(food, quantity),
    });
  };

  const handleDragEnd = ({ data }: { data: Row[] }) => {
    let currentMeal: MealType | undefined;

    for (const item of data) {
      if (item.kind === 'header') {
        currentMeal = item.mealType;
        continue;
      }

      const targetMeal = currentMeal ?? MEAL_ORDER[0];
      if (item.entry.mealType !== targetMeal) {
        updateFoodEntry(item.entry.id, { mealType: targetMeal });
      }
    }
  };

  const openAddMeal = () => router.push('/(tabs)/nutrition/add' as never);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading}>Journal du jour</Text>
        <View style={styles.headerSpacer} />
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyContent}>
          <EmptyState
            icon="restaurant-outline"
            title="Aucun repas aujourd'hui"
            subtitle="Ajoutez un aliment pour commencer le journal."
          />
          <View style={styles.emptyButton}>
            <Button title="Ajouter un repas" onPress={openAddMeal} />
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <DraggableFlatList<Row>
            data={rows}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.content}
            style={styles.list}
            onDragEnd={handleDragEnd}
            renderItem={({ item, drag, isActive }) => {
              if (item.kind === 'header') {
                return (
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealTitle}>{MEAL_LABELS[item.mealType]}</Text>
                    <Text style={styles.mealSubtotal}>{mealTotals[item.mealType].calories} kcal</Text>
                  </View>
                );
              }

              return (
                <ScaleDecorator>
                  <FoodEntryRow
                    entry={item.entry}
                    drag={drag}
                    isActive={isActive}
                    onDeleteEntry={handleDelete}
                    onMoveEntry={handleMove}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                </ScaleDecorator>
              );
            }}
          />

          <View style={styles.footer}>
            <Button title="Ajouter un repas" onPress={openAddMeal} />
          </View>
        </View>
      )}
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
  body: { flex: 1 },
  list: { flex: 1 },
  content: { gap: 8, paddingTop: 8, paddingBottom: 16 },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  mealTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: c.textPrimary },
  mealSubtotal: { fontSize: 14, fontWeight: '800', color: c.primary },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  emptyContent: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  emptyButton: { paddingBottom: 16 },
});
