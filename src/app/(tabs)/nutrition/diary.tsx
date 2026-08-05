import { useCallback, useMemo, useReducer } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodEntryRow } from '../../../components/nutrition/FoodEntryRow';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { appAlert } from '../../../components/ui/AppDialog';
import { useTranslation } from '../../../i18n/useTranslation';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { fonts } from '../../../theme/fonts';
import { spacing } from '../../../theme/tokens';
import { collectMealGroups, mealTypeLabel } from '../../../constants/meals';
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
  const { t } = useTranslation();
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
    const grouped = new Map<MealType, FoodEntry[]>();

    for (const entry of entries) {
      const list = grouped.get(entry.mealType);
      if (list) {
        list.push(entry);
      } else {
        grouped.set(entry.mealType, [entry]);
      }
    }

    return grouped;
  }, [entries]);
  // Groupes affichés : uniquement ceux réellement utilisés aujourd'hui
  // (aucun groupe pré-défini à vide).
  const dayGroups = useMemo(() => collectMealGroups(entries), [entries]);
  // Tous les groupes connus (toutes dates) pour le menu "Déplacer vers".
  const allGroups = useMemo(() => collectMealGroups(entriesState), [entriesState]);
  const mealTotals = useMemo(() => {
    const totals = new Map<MealType, ReturnType<typeof calculateDailyTotals>>();

    for (const mealType of dayGroups) {
      totals.set(mealType, calculateDailyTotals(entriesByMeal.get(mealType) ?? []));
    }

    return totals;
  }, [dayGroups, entriesByMeal]);
  const rows = useMemo<Row[]>(
    () =>
      dayGroups.flatMap((mealType) => [
        { key: `h-${mealType}`, kind: 'header' as const, mealType },
        ...(entriesByMeal.get(mealType) ?? []).map((entry) => ({
          key: entry.id,
          kind: 'entry' as const,
          entry,
        })),
      ]),
    [dayGroups, entriesByMeal]
  );

  const handleDelete = (entry: FoodEntry) => {
    appAlert(
      t('dialog.deleteMealTitle'),
      t('dialog.deleteMealMessage', { name: entry.foodName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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
      appAlert(t('foods.notFound'), t('nutrition.diary.recalcError'));
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
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading}>{t('nutrition.diaryTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyContent}>
          <EmptyState
            icon="restaurant-outline"
            title={t('nutrition.diary.emptyTitle')}
            subtitle={t('nutrition.diary.emptySubtitle')}
            actionLabel={t('nutrition.addMeal')}
            onAction={openAddMeal}
          />
        </View>
      ) : (
        <View style={styles.body}>
          <FlatList<Row>
            data={rows}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.content}
            style={styles.list}
            renderItem={({ item }) => {
              if (item.kind === 'header') {
                return (
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealTitle}>{mealTypeLabel(item.mealType, t)}</Text>
                    <Text style={styles.mealSubtotal}>
                      {mealTotals.get(item.mealType)?.calories ?? 0} kcal
                    </Text>
                  </View>
                );
              }

              return (
                <FoodEntryRow
                  entry={item.entry}
                  drag={() => {}}
                  isActive={false}
                  availableMealTypes={allGroups}
                  onDeleteEntry={handleDelete}
                  onMoveEntry={handleMove}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              );
            }}
          />

          <View style={styles.footer}>
            <Button title={t('nutrition.addMeal')} onPress={openAddMeal} />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heading: { fontSize: 18, fontFamily: fonts.sansBold, color: c.textPrimary },
  headerSpacer: { width: 24 },
  body: { flex: 1 },
  list: { flex: 1 },
  content: { gap: spacing.xs, paddingTop: spacing.xs, paddingBottom: spacing.md },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  mealTitle: { flex: 1, fontSize: 16, fontFamily: fonts.sansHeavy, color: c.textPrimary },
  mealSubtotal: { fontSize: 14, fontFamily: fonts.sansHeavy, color: c.primary },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  emptyContent: { flex: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
});
