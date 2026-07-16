import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';

function BackToHomeButton() {
  const c = useColors();
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

export default function FoodsLayout() {
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
          title: 'Aliments',
          headerLeft: () => <BackToHomeButton />,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Link
                href={{
                  pathname: '/(tabs)/community',
                  params: { tab: 'foods' },
                } as never}
                asChild>
                <TouchableOpacity
                  style={styles.settingsButton}
                  hitSlop={8}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Bases d’aliments communautaires">
                  <Ionicons name="cloud-download-outline" size={22} color={c.primary} />
                </TouchableOpacity>
              </Link>
              <Link href="/(tabs)/foods/params" asChild>
                <TouchableOpacity
                  style={styles.settingsButton}
                  hitSlop={8}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Paramètres des aliments">
                  <Ionicons name="settings-outline" size={22} color={c.primary} />
                </TouchableOpacity>
              </Link>
            </View>
          ),
        }}
      />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ headerShown: false }} />
      <Stack.Screen name="[id]/edit" options={{ headerShown: false }} />
      <Stack.Screen name="params" options={{ headerShown: false }} />
    </Stack>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  settingsButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
