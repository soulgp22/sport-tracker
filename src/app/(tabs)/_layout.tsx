import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { type ComponentProps } from 'react';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '../../theme/fonts';
import { radius } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { useTranslation } from '../../i18n/useTranslation';

type FeatherName = ComponentProps<typeof Feather>['name'];

/** Hauteur (dp) de la zone de contenu de la tab bar (icônes + libellés).
 *  Le fond de la barre se prolonge derrière la barre de navigation système en
 *  ajoutant l'inset bas : hauteur totale = contenu + inset, avec l'inset en
 *  padding bas. Aucune valeur système codée en dur : l'inset vaut ~48 dp sur
 *  un appareil à trois boutons, ~16 dp sur une barre de geste, 0 sans barre. */
const TAB_BAR_CONTENT_HEIGHT = 62;

function tabIcon(name: FeatherName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <View style={{ alignItems: 'center', gap: 4 }}>
        <View
          style={{
            width: 18,
            height: 2,
            borderRadius: radius.pill,
            backgroundColor: focused ? color : 'transparent',
          }}
        />
        <Feather name={name} size={21} color={color} />
      </View>
    );
  };
}

export default function TabLayout() {
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      // Retour = écran précédent, jamais un raccourci vers l'accueil.
      // Le défaut de React Navigation (`firstRoute`) renvoyait sur l'accueil
      // dès qu'on quittait un onglet pour un autre (Nutrition → Aliments,
      // Programmes → Communauté, Profil → Réglages…), car ces sections sont
      // des onglets masqués et non des écrans empilés. `history` rejoue la
      // pile de visites : l'accueil n'est atteint que s'il était l'écran
      // précédent. Voir known_bugs.md.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarActiveTintColor: c.secondary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.sansSemi, fontSize: 10, marginBottom: 2 },
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopWidth: 1,
          borderTopColor: c.border,
          // Hauteur explicite : la zone de contenu conserve exactement sa
          // hauteur actuelle (62 dp), l'inset bas vient s'y ajouter pour que le
          // fond de la barre couvre la zone de la barre de navigation système.
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        sceneStyle: { backgroundColor: c.bg },
      }}>
      {/* Onglets visibles : Accueil, Séance, Nutrition, Progression, Profil. */}
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home'), tabBarIcon: tabIcon('home') }}
      />
      <Tabs.Screen
        name="session"
        options={{ title: t('nav.session'), tabBarIcon: tabIcon('activity') }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: t('nav.nutrition'), tabBarIcon: tabIcon('pie-chart') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: t('nav.progress'), tabBarIcon: tabIcon('trending-up') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('nav.profile'), tabBarIcon: tabIcon('user') }}
      />
      {/* Sections routables mais hors tab bar (accessibles depuis l'accueil
          ou les écrans parents) : aucune fonctionnalité ne disparaît. */}
      <Tabs.Screen name="programs" options={{ href: null }} />
      <Tabs.Screen name="exercises" options={{ href: null }} />
      <Tabs.Screen name="foods" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
