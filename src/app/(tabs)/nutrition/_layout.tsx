import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';

function BackToHomeButton() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)' as never);
  };

  return (
    <TouchableOpacity onPress={handlePress} hitSlop={8} activeOpacity={0.7}>
      <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
    </TouchableOpacity>
  );
}

export default function NutritionLayout() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: 'Nutrition',
          headerLeft: () => <BackToHomeButton />,
          headerRight: () => (
            <Link href={'/(tabs)/nutrition/goals' as never} asChild>
              <TouchableOpacity style={styles.settingsButton} hitSlop={8} activeOpacity={0.7}>
                <Ionicons name="settings-outline" size={22} color={c.primary} />
              </TouchableOpacity>
            </Link>
          ),
        }}
      />
      <Stack.Screen name="add" options={{ headerShown: false }} />
      <Stack.Screen name="diary" options={{ headerShown: false }} />
      <Stack.Screen name="goals" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
    </Stack>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  settingsButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
