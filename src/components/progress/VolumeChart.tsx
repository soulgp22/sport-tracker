import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import type { DataPoint } from '../../hooks/useProgressData';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';

interface VolumeChartProps {
  data: DataPoint[];
}

export function VolumeChart({ data }: VolumeChartProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Pas encore de données</Text>
      </View>
    );
  }

  const chartData = data.map((d) => ({
    value: d.value,
    label: d.label,
    frontColor: c.primary,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Volume (kg·reps)</Text>
      <BarChart
        data={chartData}
        height={180}
        spacing={16}
        barWidth={32}
        barBorderRadius={4}
        hideRules={false}
        rulesColor={c.border}
        yAxisColor="transparent"
        xAxisColor={c.border}
        yAxisTextStyle={styles.axisLabel}
        xAxisLabelTextStyle={styles.axisLabel}
        hideYAxisText={false}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { gap: 8, paddingRight: 8 },
  title: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  empty: { height: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: c.textMuted, fontSize: 13 },
  axisLabel: { fontSize: 10, color: c.textSecondary },
});
