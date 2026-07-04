import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

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

export default function ProgramsLayout() {
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
          title: 'Programmes',
          headerLeft: () => <BackToHomeButton />,
          headerRight: () => (
            <Link href="/(tabs)/programs/new" asChild>
              <TouchableOpacity style={styles.addButton} hitSlop={8} activeOpacity={0.7}>
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </Link>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
