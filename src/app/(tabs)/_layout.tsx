import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

import { useColors } from '../../theme/useColors';
import { useTranslation } from '../../i18n/useTranslation';

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

export default function TabLayout() {
  const c = useColors();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="programs" options={{ headerShown: false }} />
      <Stack.Screen name="community" options={{ headerShown: false }} />
      <Stack.Screen name="session" options={{ headerShown: false }} />
      <Stack.Screen name="exercises" options={{ headerShown: false }} />
      <Stack.Screen name="foods" options={{ headerShown: false }} />
      <Stack.Screen name="nutrition" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
      <Stack.Screen name="progress" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings"
        options={{
          title: t('nav.settings'),
          headerLeft: () => <BackToHomeButton />,
        }}
      />
    </Stack>
  );
}
