import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { useCommunityStore } from '../../../store/communityStore';
import { fonts } from '../../../theme/fonts';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { useTranslation } from '../../../i18n/useTranslation';

function BackButton() {
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

function RefreshButton() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const loading = useCommunityStore((s) => s.loading);
  const fetchManifest = useCommunityStore((s) => s.fetchManifest);

  return (
    <TouchableOpacity
      style={styles.headerButton}
      onPress={() => void fetchManifest()}
      hitSlop={8}
      activeOpacity={0.7}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Actualiser le catalogue communautaire">
      <Ionicons name="refresh" size={20} color={loading ? c.textMuted : c.primary} />
    </TouchableOpacity>
  );
}

export default function CommunityLayout() {
  const c = useColors();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.textPrimary,
        headerTitleStyle: { fontFamily: fonts.sansBold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: t('community.heading'),
          headerLeft: () => <BackButton />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <RefreshButton />
            </View>
          ),
        }}
      />
    </Stack>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
