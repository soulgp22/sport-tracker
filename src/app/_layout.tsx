import { useEffect, useMemo } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
} from '@expo-google-fonts/oswald';
import {
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';

import { configureNotifications } from '../lib/restTimerNotifications';
import { initMealPhotoRuntime } from '../lib/mealPhotoCapability';
import { RestTimerBanner } from '../components/session/RestTimerBanner';
import { useColors, useThemeMode } from '../theme/useColors';
import { AppDialog } from '../components/ui/AppDialog';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const c = useColors();
  const mode = useThemeMode();
  const [fontsLoaded, fontError] = useFonts({
    Oswald_500Medium,
    Oswald_600SemiBold,
    Oswald_700Bold,
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    'OstrichSans-Medium': require('../../assets/fonts/OstrichSans-Medium.otf'),
    'OstrichSans-Heavy': require('../../assets/fonts/OstrichSans-Heavy.otf'),
  });
  const navigationTheme = useMemo(() => {
    const baseTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: c.primary,
        background: c.bg,
        card: c.bg,
        text: c.textPrimary,
        border: c.border,
        notification: c.secondary,
      },
    };
  }, [c, mode]);

  useEffect(() => {
    void configureNotifications();
    // Compatibilité historique : le runtime photo est désormais un no-op, car
    // le serveur d'analyse est sondé à la demande par MealPhotoReview.
    void initMealPhotoRuntime();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <RestTimerBanner />
        <AppDialog />
        <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
