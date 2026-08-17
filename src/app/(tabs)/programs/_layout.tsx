import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { useColors } from '../../../theme/useColors';
import { fonts } from '../../../theme/fonts';
import type { ThemeColors } from '../../../theme/palettes';
import { useTranslation } from '../../../i18n/useTranslation';

function BackToHomeButton() {
  const c = useColors();
  const { t } = useTranslation();
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
    <TouchableOpacity
      style={styles.iconButton}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('common.backHome')}>
      <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
    </TouchableOpacity>
  );
}

export default function ProgramsLayout() {
  const c = useColors();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
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
          title: t('nav.programs'),
        }}
      />
    </Stack>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
