import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { calculateDailyTotals } from '../../lib/nutritionCalc';
import type { FoodEntry, MealType } from '../../types';
import { TextInput } from '../ui/TextInput';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
};

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface MealSectionProps {
  mealType: MealType;
  entries: FoodEntry[];
  onDeleteEntry: (entry: FoodEntry) => void;
  onMoveEntry: (entry: FoodEntry, mealType: MealType) => void;
  onUpdateQuantity: (entry: FoodEntry, quantity: number) => void;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

function parseQuantity(value: string) {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function MealSection({
  mealType,
  entries,
  onDeleteEntry,
  onMoveEntry,
  onUpdateQuantity,
}: MealSectionProps) {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [quantityText, setQuantityText] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const totals = calculateDailyTotals(entries);

  const startEdit = (entry: FoodEntry) => {
    setEditingEntryId(entry.id);
    setQuantityText(formatNumber(entry.quantity));
    setQuantityError('');
  };

  const cancelEdit = () => {
    setEditingEntryId(null);
    setQuantityText('');
    setQuantityError('');
  };

  const saveEdit = (entry: FoodEntry) => {
    const quantity = parseQuantity(quantityText);
    if (quantity <= 0) {
      setQuantityError('La quantité doit être supérieure à 0.');
      return;
    }

    onUpdateQuantity(entry, quantity);
    cancelEdit();
  };

  const openMoveMenu = (entry: FoodEntry) => {
    Alert.alert(
      'Déplacer vers',
      undefined,
      [
        ...MEAL_ORDER.filter((item) => item !== mealType).map((targetMealType) => ({
          text: MEAL_LABELS[targetMealType],
          onPress: () => onMoveEntry(entry, targetMealType),
        })),
        { text: 'Annuler', style: 'cancel' as const },
      ]
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{MEAL_LABELS[mealType]}</Text>
        <Text style={styles.subtotal}>{totals.calories} kcal</Text>
      </View>

      <View style={styles.entries}>
        {entries.map((entry) => {
          const editing = entry.id === editingEntryId;

          if (editing) {
            return (
              <View key={entry.id} style={styles.row}>
                <View style={styles.editBody}>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {entry.foodName}
                  </Text>
                  <View style={styles.editControls}>
                    <View style={styles.quantityField}>
                      <TextInput
                        value={quantityText}
                        onChangeText={(value) => {
                          setQuantityText(value);
                          setQuantityError('');
                        }}
                        error={quantityError}
                        keyboardType="numeric"
                        placeholder="0"
                        style={styles.quantityInput}
                      />
                    </View>
                    <Text style={styles.unitLabel}>{entry.unit}</Text>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={cancelEdit}
                      activeOpacity={0.75}
                      accessibilityRole="button">
                      <Ionicons name="close" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => saveEdit(entry)}
                      activeOpacity={0.75}
                      accessibilityRole="button">
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={entry.id}
              style={styles.row}
              onPress={() => startEdit(entry)}
              activeOpacity={0.75}>
              <View style={styles.body}>
                <Text style={styles.foodName} numberOfLines={1}>
                  {entry.foodName}
                </Text>
                <Text style={styles.meta}>
                  {formatNumber(entry.quantity)} {entry.unit} · {entry.calculatedNutrition.calories} kcal
                </Text>
                <Text style={styles.macros}>
                  P {formatNumber(entry.calculatedNutrition.protein)} g · G{' '}
                  {formatNumber(entry.calculatedNutrition.carbs)} g · L{' '}
                  {formatNumber(entry.calculatedNutrition.fat)} g
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.textAction}
                  onPress={() => startEdit(entry)}
                  activeOpacity={0.75}
                  accessibilityRole="button">
                  <Text style={styles.textActionLabel}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.moveButton}
                  onPress={() => openMoveMenu(entry)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Déplacer">
                  <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onDeleteEntry(entry)}
                  activeOpacity={0.75}
                  accessibilityRole="button">
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
  },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  subtotal: { fontSize: 14, fontWeight: '800', color: colors.primary },
  entries: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: { flex: 1, gap: 3 },
  foodName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textSecondary },
  macros: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  actions: { alignItems: 'flex-end', gap: 8 },
  textAction: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  textActionLabel: { fontSize: 12, fontWeight: '800', color: colors.primary },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  moveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  editBody: { flex: 1, gap: 8 },
  editControls: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  quantityField: { width: 96 },
  quantityInput: { minHeight: 40, paddingVertical: 8 },
  unitLabel: { paddingTop: 11, fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
