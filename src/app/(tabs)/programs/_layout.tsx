import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors } from '../../../constants/colors';

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
      <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
  );
}

export default function ProgramsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: 'Programmes',
          headerLeft: () => <BackToHomeButton />,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Link href={'/(tabs)/community' as never} asChild>
                <TouchableOpacity style={styles.communityButton} hitSlop={8} activeOpacity={0.7}>
                  <Ionicons name="cloud-download-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              </Link>
              <Link href="/(tabs)/programs/new" asChild>
                <TouchableOpacity style={styles.addButton} hitSlop={8} activeOpacity={0.7}>
                  <Ionicons name="add" size={22} color={colors.primaryText} />
                </TouchableOpacity>
              </Link>
            </View>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  communityButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
