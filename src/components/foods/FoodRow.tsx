import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import type { Food } from '../../types';

interface FoodRowProps {
  food: Food;
  onPress: () => void;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

export function FoodRow({ food, onPress }: FoodRowProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const nutrition = food.nutritionPer100g;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {food.name}
          </Text>
          {food.isCustom ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Perso</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {food.category} · {food.unit}
        </Text>

        <Text style={styles.preview} numberOfLines={1}>
          {Math.round(nutrition.calories)} kcal · P {formatNumber(nutrition.protein)} · G{' '}
          {formatNumber(nutrition.carbs)} · L {formatNumber(nutrition.fat)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
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
    marginVertical: 5,
    gap: 10,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: c.textPrimary },
  meta: { fontSize: 13, color: c.textSecondary },
  preview: { fontSize: 13, color: c.primary, fontWeight: '600' },
  badge: {
    backgroundColor: c.secondary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: c.textPrimary },
});
