/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-native-.*|@sentry/react-native|native-base|react-native-svg|react-native-gifted-charts|expo-modules-core|expo-font|@expo/vector-icons)/)',
  ],
  moduleNameMapper: {
    'react-native-gifted-charts': '<rootDir>/__mocks__/react-native-gifted-charts.js',
    '^expo-font$': '<rootDir>/__mocks__/expo-font.js',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^@expo-google-fonts/fraunces$': '<rootDir>/__mocks__/expo-google-fonts-fraunces.js',
    '^@expo-google-fonts/hanken-grotesk$': '<rootDir>/__mocks__/expo-google-fonts-hanken-grotesk.js',
  },
};
