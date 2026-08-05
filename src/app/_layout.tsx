import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Fraunces_400Regular_Italic,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  Barlow_400Regular,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_600SemiBold_Italic,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';

import { configureNotifications } from '../lib/restTimerNotifications';
import { initMealPhotoRuntime } from '../lib/mealPhotoCapability';
import { RestTimerBanner } from '../components/session/RestTimerBanner';
import { useColors, useThemeMode } from '../theme/useColors';
import { AppDialog } from '../components/ui/AppDialog';

void SplashScreen.preventAutoHideAsync();

/**
 * Mode immersif Android : masque la barre de navigation système. Elle
 * réapparaît temporairement sur un balayage depuis le bas (inset-swipe).
 * Require synchrone inerte sous Jest / Expo Go (module natif absent → catch).
 */
function enableImmersiveNavigationBar() {
  if (Platform.OS !== 'android') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NavigationBar = require('expo-navigation-bar') as typeof import('expo-navigation-bar');
    void NavigationBar.setVisibilityAsync('hidden');
  } catch {
    // Module natif indisponible : on ignore silencieusement.
  }
}

export default function RootLayout() {
  const c = useColors();
  const mode = useThemeMode();
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    Barlow_400Regular,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Barlow_800ExtraBold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_600SemiBold_Italic,
    BarlowCondensed_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
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
    // Runtime executorch initialisé au démarrage uniquement si le gating
    // photo-repas est OK (jamais sous Jest : canUseMealPhoto() → false).
    void initMealPhotoRuntime();
    enableImmersiveNavigationBar();
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
