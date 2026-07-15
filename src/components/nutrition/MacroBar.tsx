import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { macroStatusColor } from '../../lib/nutritionCalc';

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  percent: number;
}

function formatValue(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

export function MacroBar({ label, current, goal, unit, percent }: MacroBarProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const statusColor = macroStatusColor(percent);
  const fillWidth = `${Math.min(Math.max(percent, 0), 100)}%` as const;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.values}>
          <Text style={styles.amount}>
            {formatValue(current)}/{formatValue(goal)} {unit}
          </Text>
          <Text style={[styles.percent, { color: statusColor }]}>{percent}%</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: fillWidth, backgroundColor: statusColor }]} />
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { flex: 1, fontSize: 14, fontWeight: '700', color: c.textPrimary },
  values: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
  percent: { fontSize: 13, fontWeight: '800' },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 999 },
});
