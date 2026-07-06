import { useCallback, useMemo, useReducer } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MEAL_ORDER,
  MealSection,
} from '../../../components/nutrition/MealSection';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { colors } from '../../../constants/colors';
import { calculateNutritionForQuantity } from '../../../lib/nutritionCalc';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useFoodStore } from '../../../store/foodStore';
import type { FoodEntry, MealType } from '../../../types';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function NutritionDiaryScreen() {
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
  const groupedEntries = useMemo(
    () =>
      MEAL_ORDER.map((mealType) => ({
        mealType,
        entries: entries.filter((entry) => entry.mealType === mealType),
      })).filter((section) => section.entries.length > 0),
    [entries]
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

  const openAddMeal = () => router.push('/(tabs)/nutrition/add' as never);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
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
          <ScrollView contentContainerStyle={styles.content}>
            {groupedEntries.map((section) => (
              <MealSection
                key={section.mealType}
                mealType={section.mealType as MealType}
                entries={section.entries}
                onDeleteEntry={handleDelete}
                onMoveEntry={handleMove}
                onUpdateQuantity={handleUpdateQuantity}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Button title="Ajouter un repas" onPress={openAddMeal} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  headerSpacer: { width: 24 },
  body: { flex: 1 },
  content: { gap: 18, paddingTop: 8, paddingBottom: 16 },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  emptyContent: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  emptyButton: { paddingBottom: 16 },
});
