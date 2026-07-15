import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import { useColors } from '../../theme/useColors';
import { useActiveSessionStore } from '../../store/activeSessionStore';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface HomeTile {
  key: string;
  label: string;
  description: string;
  icon: IoniconsName;
  href:
    | '/(tabs)/programs'
    | '/(tabs)/exercises'
    | '/(tabs)/foods'
    | '/(tabs)/nutrition'
    | '/(tabs)/history'
    | '/(tabs)/progress'
    | '/(tabs)/settings';
}

const HOME_TILES: HomeTile[] = [
  {
    key: 'programs',
    label: 'Programmes',
    description: 'Planifier vos entraînements',
    icon: 'barbell-outline',
    href: '/(tabs)/programs',
  },
  {
    key: 'exercises',
    label: 'Exercices',
    description: 'Explorer le catalogue',
    icon: 'body-outline',
    href: '/(tabs)/exercises',
  },
  {
    key: 'nutrition',
    label: 'Nutrition',
    description: 'Suivre calories et macros',
    icon: 'pie-chart-outline',
    href: '/(tabs)/nutrition',
  },
  {
    key: 'foods',
    label: 'Aliments',
    description: 'Gérer votre catalogue',
    icon: 'restaurant-outline',
    href: '/(tabs)/foods',
  },
  {
    key: 'progress',
    label: 'Progression',
    description: 'Mesurer vos résultats',
    icon: 'trending-up-outline',
    href: '/(tabs)/progress',
  },
  {
    key: 'history',
    label: 'Historique',
    description: 'Revoir vos séances',
    icon: 'time-outline',
    href: '/(tabs)/history',
  },
  {
    key: 'settings',
    label: 'Paramètres',
    description: 'Apparence, sauvegardes et imports',
    icon: 'settings-outline',
    href: '/(tabs)/settings',
  },
];

export default function HomeScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const active = useActiveSessionStore((state) => state.active);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>VOTRE ESPACE</Text>
        <Text style={styles.title}>Sport Tracker</Text>
        <Text style={styles.subtitle}>
          Entraînez-vous avec intention, mesurez ce qui compte.
        </Text>

        <TouchableOpacity
          style={styles.sessionCard}
          onPress={() => router.push('/(tabs)/session')}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={active ? 'Reprendre la séance en cours' : 'Démarrer une séance'}
          accessibilityHint="Ouvre votre espace de séance">
          <View style={styles.sessionIconBox}>
            <Ionicons name={active ? 'refresh' : 'play'} size={24} color={c.primary} />
          </View>
          <View style={styles.sessionCopy}>
            <Text style={styles.sessionKicker}>
              {active ? 'SÉANCE EN COURS' : 'PROCHAIN EFFORT'}
            </Text>
            <Text style={styles.sessionTitle}>
              {active ? 'Reprendre la séance' : 'Démarrer une séance'}
            </Text>
            <Text style={styles.sessionSubtitle} numberOfLines={1}>
              {active
                ? `${active.programName} · ${active.dayName}`
                : 'Choisissez un programme et un jour'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={c.primaryText} />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Votre suivi</Text>
          <Text style={styles.sectionMeta}>Tout au même endroit</Text>
        </View>

        <View style={styles.grid}>
          {HOME_TILES.map((tile) => {
            const isWide = tile.key === 'settings';
            return (
              <TouchableOpacity
                key={tile.key}
                style={[styles.tile, isWide ? styles.tileWide : null]}
                onPress={() => router.push(tile.href as never)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={tile.label}
                accessibilityHint={tile.description}>
                <View style={styles.iconBox}>
                  <Ionicons name={tile.icon} size={24} color={c.primary} />
                </View>
                <View style={styles.tileCopy}>
                  <Text style={styles.tileLabel} numberOfLines={1}>
                    {tile.label}
                  </Text>
                  <Text style={styles.tileDescription} numberOfLines={2}>
                    {tile.description}
                  </Text>
                </View>
                {isWide ? (
                  <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: {
      paddingHorizontal: 18,
      paddingTop: 22,
      paddingBottom: 36,
    },
    eyebrow: {
      fontSize: 11,
      letterSpacing: 1.8,
      fontFamily: fonts.sansBold,
      color: c.primary,
      marginBottom: 5,
    },
    title: {
      fontSize: 32,
      fontFamily: fonts.serifBold,
      color: c.textPrimary,
    },
    subtitle: {
      maxWidth: 320,
      marginTop: 6,
      fontSize: 15,
      lineHeight: 21,
      fontFamily: fonts.sans,
      color: c.textSecondary,
    },
    sessionCard: {
      minHeight: 118,
      marginTop: 24,
      borderRadius: 18,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
      backgroundColor: c.primary,
      shadowColor: c.overlay,
      shadowOpacity: 0.16,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    sessionIconBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionCopy: { flex: 1, gap: 2 },
    sessionKicker: {
      fontSize: 10,
      letterSpacing: 1.3,
      fontFamily: fonts.sansBold,
      color: c.primaryText,
      opacity: 0.72,
    },
    sessionTitle: {
      fontSize: 19,
      fontFamily: fonts.serifBold,
      color: c.primaryText,
    },
    sessionSubtitle: {
      fontSize: 12,
      fontFamily: fonts.sans,
      color: c.primaryText,
      opacity: 0.82,
    },
    sectionHeader: {
      marginTop: 28,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: fonts.serifBold,
      color: c.textPrimary,
    },
    sectionMeta: {
      fontSize: 12,
      fontFamily: fonts.sans,
      color: c.textMuted,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    tile: {
      width: '48%',
      minHeight: 132,
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      shadowColor: c.overlay,
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 1,
    },
    tileWide: {
      width: '100%',
      minHeight: 88,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileCopy: { flex: 1, gap: 3 },
    tileLabel: {
      fontSize: 15,
      fontFamily: fonts.sansBold,
      color: c.textPrimary,
    },
    tileDescription: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: fonts.sans,
      color: c.textSecondary,
    },
  });
