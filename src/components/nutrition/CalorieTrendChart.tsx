import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';

interface CalorieTrendDay {
  label: string;
  calories: number;
}

interface CalorieTrendChartProps {
  points: CalorieTrendDay[];
  goal: number;
}

export function CalorieTrendChart({ points, goal }: CalorieTrendChartProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const hasData = points.length > 0 && points.some((point) => point.calories > 0);

  if (!hasData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Pas encore de données</Text>
      </View>
    );
  }

  const labelStep = points.length <= 8 ? 1 : Math.ceil(points.length / 8);
  const spacing = points.length <= 7 ? 44 : points.length <= 14 ? 30 : 16;
  const chartData = points.map((point, index) => ({
    value: point.calories,
    label: index % labelStep === 0 ? point.label : '',
  }));
  const maxSource = Math.max(goal, ...points.map((point) => point.calories));
  const maxValue = Math.ceil(maxSource * 1.15);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calories consommées</Text>
      <LineChart
        data={chartData}
        height={180}
        spacing={spacing}
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
        maxValue={maxValue}
        roundToDigits={0}
        showReferenceLine1={goal > 0}
        referenceLine1Position={goal}
        referenceLine1Config={{
          color: c.textMuted,
          type: 'dashed',
          thickness: 1,
          dashWidth: 6,
          dashGap: 4,
        }}
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
