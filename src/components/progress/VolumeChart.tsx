import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import type { DataPoint } from '../../hooks/useProgressData';
import { colors } from '../../constants/colors';

interface VolumeChartProps {
  data: DataPoint[];
}

export function VolumeChart({ data }: VolumeChartProps) {
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
    frontColor: colors.primary,
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
        rulesColor={colors.border}
        yAxisColor="transparent"
        xAxisColor={colors.border}
        yAxisTextStyle={styles.axisLabel}
        xAxisLabelTextStyle={styles.axisLabel}
        hideYAxisText={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingRight: 8 },
  title: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  empty: { height: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  axisLabel: { fontSize: 10, color: colors.textSecondary },
});
