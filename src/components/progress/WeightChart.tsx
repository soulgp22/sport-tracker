import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import type { DataPoint } from '../../hooks/useProgressData';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';

interface WeightChartProps {
  data: DataPoint[];
  title?: string;
}

export function WeightChart({ data, title = 'Poids maximum (kg)' }: WeightChartProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Pas encore de données</Text>
      </View>
    );
  }

  const chartData = data.map((d) => ({ value: d.value, label: d.label }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <LineChart
        data={chartData}
        height={180}
        spacing={52}
        color={c.primary}
        thickness={2}
        dataPointsColor={c.primary}
        dataPointsRadius={4}
        startFillColor={c.primary}
        startOpacity={0.2}
        endOpacity={0.02}
        areaChart
        hideRules={false}
        rulesColor={c.border}
        yAxisColor="transparent"
        xAxisColor={c.border}
        yAxisTextStyle={styles.axisLabel}
        xAxisLabelTextStyle={styles.axisLabel}
        hideYAxisText={false}
        curved
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
