import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useMemo, type ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { fonts } from '../../theme/fonts';
import { makeShadows } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { useTranslation } from '../../i18n/useTranslation';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconsName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? name : (`${name}-outline` as IoniconsName)} size={22} color={color} />;
  };
}

export default function TabLayout() {
  const c = useColors();
  const { t } = useTranslation();
  const shadows = useMemo(() => makeShadows(c), [c]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.sansSemi, fontSize: 10, marginBottom: 2 },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          minHeight: 62,
          paddingTop: 6,
          ...shadows.raised,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        sceneStyle: { backgroundColor: c.bg },
      }}>
      {/* Onglets visibles : les 5 sections principales, à 1 tap du pouce. */}
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home'), tabBarIcon: tabIcon('home') }}
      />
      <Tabs.Screen
        name="programs"
        options={{ title: t('nav.programs'), tabBarIcon: tabIcon('barbell') }}
      />
      <Tabs.Screen
        name="session"
        options={{ title: t('nav.session'), tabBarIcon: tabIcon('play-circle') }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: t('nav.nutrition'), tabBarIcon: tabIcon('nutrition') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: t('nav.progress'), tabBarIcon: tabIcon('analytics') }}
      />
      {/* Sections routables mais hors tab bar (accessibles depuis l'accueil
          ou les écrans parents) : aucune fonctionnalité ne disparaît. */}
      <Tabs.Screen name="exercises" options={{ href: null }} />
      <Tabs.Screen name="foods" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
