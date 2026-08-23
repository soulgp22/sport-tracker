import { Stack } from 'expo-router';

import { useColors } from '../../../theme/useColors';
import { fonts } from '../../../theme/fonts';
import { useTranslation } from '../../../i18n/useTranslation';

export default function SessionLayout() {
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
          title: t('nav.session'),
        }}
      />
      <Stack.Screen name="active" options={{ headerShown: false }} />
    </Stack>
  );
}
