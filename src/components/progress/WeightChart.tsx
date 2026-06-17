import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import type { DataPoint } from '../../hooks/useProgressData';

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
        color="#2563eb"
        thickness={2}
        dataPointsColor="#2563eb"
        dataPointsRadius={4}
        startFillColor="#2563eb"
        startOpacity={0.2}
        endOpacity={0.02}
        areaChart
        hideRules={false}
        rulesColor="#f3f4f6"
        yAxisColor="transparent"
        xAxisColor="#e5e7eb"
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
  title: { fontSize: 14, fontWeight: '600', color: '#374151' },
  empty: { height: 100, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 13 },
  axisLabel: { fontSize: 10, color: '#9ca3af' },
});
