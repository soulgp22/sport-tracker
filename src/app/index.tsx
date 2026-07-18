import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useOnboardingStore } from '../store/onboardingStore';
import { useColors } from '../theme/useColors';

export default function Index() {
  const colors = useColors();
  const completed = useOnboardingStore((state) => state.completed);
  const hasHydrated = useOnboardingStore((state) => state.hasHydrated);
  if (!hasHydrated) {
    return <View style={[styles.loading, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.primary} /></View>;
  }
  return <Redirect href={(completed ? '/(tabs)' : '/onboarding') as never} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
