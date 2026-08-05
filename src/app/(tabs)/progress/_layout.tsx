import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { fonts } from '../../../theme/fonts';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { useTranslation } from '../../../i18n/useTranslation';

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

export default function ProgressLayout() {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
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
          title: t('nav.progress'),
          headerRight: () => (
            <Link href="/(tabs)/history" asChild>
              <TouchableOpacity hitSlop={8} activeOpacity={0.75}>
                <Text style={styles.historyLink}>{t('nav.history')}</Text>
              </TouchableOpacity>
            </Link>
          ),
        }}
      />
    </Stack>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  historyLink: { fontSize: 14, fontFamily: fonts.sansSemi, color: c.primary },
});
