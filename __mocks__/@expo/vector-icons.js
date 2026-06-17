import React from 'react';
import { Text } from 'react-native';

const MockIonicons = (props) => <Text testID="ionicon" {...props}>{props.name}</Text>;

module.exports = {
  Ionicons: MockIonicons,
};
