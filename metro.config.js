const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Alias react-native-linear-gradient → expo-linear-gradient (Expo Go compatible)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-linear-gradient': require.resolve('expo-linear-gradient'),
};

module.exports = config;
