import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { colors } from '../../constants/colors';

interface CalorieTrendDay {
  date: string;
  calories: number;
}

interface CalorieTrendChartProps {
  days: CalorieTrendDay[];
  goal: number;
}

function formatShortDate(date: string) {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

export function CalorieTrendChart({ days, goal }: CalorieTrendChartProps) {
  const hasData = days.length > 0 && days.some((day) => day.calories > 0);

  if (!hasData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Pas encore de données</Text>
      </View>
    );
  }

  const isCompact = days.length > 7;
  const spacing = isCompact ? 16 : 44;
  const chartData = days.map((day, index) => ({
    value: day.calories,
    label: !isCompact || index % 5 === 0 ? formatShortDate(day.date) : '',
  }));
  const maxSource = Math.max(goal, ...days.map((day) => day.calories));
  const maxValue = Math.ceil(maxSource * 1.15);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calories consommées</Text>
      <LineChart
        data={chartData}
        height={180}
        spacing={spacing}
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
        maxValue={maxValue}
        roundToDigits={0}
        showReferenceLine1={goal > 0}
        referenceLine1Position={goal}
        referenceLine1Config={{
          color: colors.textMuted,
          type: 'dashed',
          thickness: 1,
          dashWidth: 6,
          dashGap: 4,
        }}
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
