import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useMemo, type ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '../../theme/fonts';
import { makeShadows } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { useTranslation } from '../../i18n/useTranslation';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

/** Hauteur (dp) de la zone de contenu de la tab bar (icônes + libellés).
 *  Le fond de la barre se prolonge derrière la barre de navigation système en
 *  ajoutant l'inset bas : hauteur totale = contenu + inset, avec l'inset en
 *  padding bas. Aucune valeur système codée en dur : l'inset vaut ~48 dp sur
 *  un appareil à trois boutons, ~16 dp sur une barre de geste, 0 sans barre. */
const TAB_BAR_CONTENT_HEIGHT = 62;

function tabIcon(name: IoniconsName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? name : (`${name}-outline` as IoniconsName)} size={22} color={color} />;
  };
}

export default function TabLayout() {
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const shadows = useMemo(() => makeShadows(c), [c]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.secondary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.sansSemi, fontSize: 10, marginBottom: 2 },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          // Hauteur explicite : la zone de contenu conserve exactement sa
          // hauteur actuelle (62 dp), l'inset bas vient s'y ajouter pour que le
          // fond de la barre couvre la zone de la barre de navigation système.
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
          ...shadows.raised,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        sceneStyle: { backgroundColor: c.bg },
      }}>
      {/* Onglets visibles : Accueil, Séance, Nutrition, Progression. */}
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home'), tabBarIcon: tabIcon('home') }}
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
      <Tabs.Screen name="programs" options={{ href: null }} />
      <Tabs.Screen name="exercises" options={{ href: null }} />
      <Tabs.Screen name="foods" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
