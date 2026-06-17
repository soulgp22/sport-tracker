import React from 'react';
import { View } from 'react-native';

const MockLineChart = ({ data, ...props }) => <View testID="line-chart" />;
const MockBarChart = ({ data, ...props }) => <View testID="bar-chart" />;

module.exports = {
  LineChart: MockLineChart,
  BarChart: MockBarChart,
};
