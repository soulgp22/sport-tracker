import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

function BackToHomeButton() {
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
      <Ionicons name="arrow-back" size={24} color="#111827" />
    </TouchableOpacity>
  );
}

export default function SessionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#f9fafb' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#f9fafb' },
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: 'Séance',
          headerLeft: () => <BackToHomeButton />,
        }}
      />
      <Stack.Screen name="active" options={{ headerShown: false }} />
    </Stack>
  );
}
