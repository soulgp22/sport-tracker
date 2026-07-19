import { useMemo } from 'react';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from '../../i18n/useTranslation';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { MEAL_LABELS, MEAL_ORDER } from '../../constants/meals';
import type { FoodEntry, MealType } from '../../types';
import { TextInput } from '../ui/TextInput';
import { appAlert } from '../ui/AppDialog';

interface FoodEntryRowProps {
  entry: FoodEntry;
  onDeleteEntry: (entry: FoodEntry) => void;
  onMoveEntry: (entry: FoodEntry, mealType: MealType) => void;
  onUpdateQuantity: (entry: FoodEntry, quantity: number) => void;
  drag: () => void;
  isActive: boolean;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

function parseQuantity(value: string) {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function FoodEntryRow({
  entry,
  onDeleteEntry,
  onMoveEntry,
  onUpdateQuantity,
  drag,
  isActive,
}: FoodEntryRowProps) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [isEditing, setIsEditing] = useState(false);
  const [quantityText, setQuantityText] = useState('');
  const [quantityError, setQuantityError] = useState('');

  const startEdit = () => {
    setIsEditing(true);
    setQuantityText(formatNumber(entry.quantity));
    setQuantityError('');
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setQuantityText('');
    setQuantityError('');
  };

  const saveEdit = () => {
    const quantity = parseQuantity(quantityText);
    if (quantity <= 0) {
      setQuantityError('La quantité doit être supérieure à 0.');
      return;
    }

    onUpdateQuantity(entry, quantity);
    cancelEdit();
  };

  const openMoveMenu = () => {
    appAlert(
      t('dialog.moveTo'),
      undefined,
      [
        ...MEAL_ORDER.filter((mealType) => mealType !== entry.mealType).map((mealType) => ({
          text: MEAL_LABELS[mealType],
          onPress: () => onMoveEntry(entry, mealType),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]
    );
  };

  if (isEditing) {
    return (
      <TouchableOpacity
        style={[styles.row, isActive && styles.activeRow]}
        onLongPress={drag}
        activeOpacity={1}
        accessibilityRole="button">
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
              <Ionicons name="close" size={18} color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={saveEdit}
              activeOpacity={0.75}
              accessibilityRole="button">
              <Ionicons name="checkmark" size={18} color={c.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.row, isActive && styles.activeRow]}
      onPress={startEdit}
      onLongPress={drag}
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
          onPress={startEdit}
          activeOpacity={0.75}
          accessibilityRole="button">
          <Text style={styles.textActionLabel}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moveButton}
          onPress={openMoveMenu}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Déplacer">
          <Ionicons name="swap-horizontal-outline" size={18} color={c.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDeleteEntry(entry)}
          activeOpacity={0.75}
          accessibilityRole="button">
          <Ionicons name="trash-outline" size={18} color={c.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  activeRow: {
    borderColor: c.primary,
    backgroundColor: c.surfaceAlt,
    elevation: 4,
    shadowColor: c.overlay,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  body: { flex: 1, gap: 3 },
  foodName: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  meta: { fontSize: 13, color: c.textSecondary },
  macros: { fontSize: 13, color: c.primary, fontWeight: '700' },
  actions: { alignItems: 'flex-end', gap: 8 },
  textAction: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.primary,
  },
  textActionLabel: { fontSize: 12, fontWeight: '800', color: c.primary },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  moveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  editBody: { flex: 1, gap: 8 },
  editControls: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  quantityField: { width: 96 },
  quantityInput: { minHeight: 40, paddingVertical: 8 },
  unitLabel: { paddingTop: 11, fontSize: 14, fontWeight: '700', color: c.textSecondary },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
});
