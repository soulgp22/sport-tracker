import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import type { FoodNutrition } from '../../types';

interface NutritionFactsProps {
  nutrition: FoodNutrition;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

function MacroCell({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue}>
        {formatNumber(value)}
        {suffix}
      </Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: number }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{formatNumber(value)} g</Text>
    </View>
  );
}

export function NutritionFacts({ nutrition }: NutritionFactsProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const details = [
    nutrition.fiber !== undefined ? { label: 'Fibres', value: nutrition.fiber } : null,
    nutrition.sugar !== undefined ? { label: 'Sucres', value: nutrition.sugar } : null,
    nutrition.salt !== undefined ? { label: 'Sel', value: nutrition.salt } : null,
  ].filter((item): item is { label: string; value: number } => item !== null);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition</Text>
        <Text style={styles.subtitle}>pour 100 g</Text>
      </View>

      <View style={styles.caloriesRow}>
        <Text style={styles.caloriesValue}>{Math.round(nutrition.calories)}</Text>
        <Text style={styles.caloriesLabel}>kcal</Text>
      </View>

      <View style={styles.macroGrid}>
        <MacroCell label="Protéines" value={nutrition.protein} suffix=" g" />
        <MacroCell label="Glucides" value={nutrition.carbs} suffix=" g" />
        <MacroCell label="Lipides" value={nutrition.fat} suffix=" g" />
      </View>

      {details.length > 0 ? (
        <View style={styles.details}>
          {details.map((detail) => (
            <DetailRow key={detail.label} label={detail.label} value={detail.value} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
  subtitle: { fontSize: 13, color: c.textSecondary },
  caloriesRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  caloriesValue: { fontSize: 34, fontWeight: '800', color: c.primary },
  caloriesLabel: { fontSize: 16, fontWeight: '700', color: c.primary },
  macroGrid: { flexDirection: 'row', gap: 8 },
  cell: {
    flex: 1,
    backgroundColor: c.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  cellValue: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
  cellLabel: { fontSize: 11, color: c.textSecondary },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: 8,
    gap: 7,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailLabel: { fontSize: 14, color: c.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
});
