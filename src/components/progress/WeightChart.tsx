import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import type { DataPoint } from '../../hooks/useProgressData';
import { colors } from '../../constants/colors';

interface WeightChartProps {
  data: DataPoint[];
}

export function WeightChart({ data }: WeightChartProps) {
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
      <Text style={styles.title}>Poids maximum (kg)</Text>
      <LineChart
        data={chartData}
        height={180}
        spacing={52}
        color={colors.primary}
        thickness={2}
        dataPointsColor={colors.primary}
        dataPointsRadius={4}
        startFillColor={colors.primary}
        startOpacity={0.2}
        endOpacity={0.02}
        areaChart
        hideRules={false}
        rulesColor={colors.border}
        yAxisColor="transparent"
        xAxisColor={colors.border}
        yAxisTextStyle={styles.axisLabel}
        xAxisLabelTextStyle={styles.axisLabel}
        hideYAxisText={false}
        curved
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
