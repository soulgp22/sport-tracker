import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

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

export default function ProgressLayout() {
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
          title: 'Progression',
          headerLeft: () => <BackToHomeButton />,
          headerRight: () => (
            <Link href="/(tabs)/history" asChild>
              <TouchableOpacity hitSlop={8} activeOpacity={0.75}>
                <Text style={styles.historyLink}>Historique</Text>
              </TouchableOpacity>
            </Link>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  historyLink: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
});
