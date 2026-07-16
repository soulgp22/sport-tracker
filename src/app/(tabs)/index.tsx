import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LifeSportLogo } from '../../components/brand/LifeSportLogo';
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
    label: 'Progrès',
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
  const { height } = useWindowDimensions();
  const compact = height < 700;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={[styles.content, compact ? styles.contentCompact : null]}>
        <View style={styles.brandRow}>
          <LifeSportLogo />
          <View style={styles.brandTag}>
            <Text style={styles.brandTagText}>SPORT · NUTRITION · PROGRÈS</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.sessionCard, compact ? styles.sessionCardCompact : null]}
          onPress={() => router.push('/(tabs)/session')}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={active ? 'Reprendre la séance en cours' : 'Démarrer une séance'}
          accessibilityHint="Ouvre votre espace de séance">
          <View style={styles.sessionIconBox}>
            <Ionicons name={active ? 'refresh' : 'play'} size={21} color={c.primary} />
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
          <Ionicons name="chevron-forward" size={20} color={c.primaryText} />
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
                  <Ionicons name={tile.icon} size={compact ? 18 : 20} color={c.primary} />
                </View>
                <View style={styles.tileCopy}>
                  <Text style={styles.tileLabel} numberOfLines={1}>
                    {tile.label}
                  </Text>
                </View>
                {isWide ? (
                  <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: {
      flex: 1,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
    },
    contentCompact: {
      paddingTop: 7,
      paddingBottom: 6,
    },
    brandRow: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    brandTag: {
      flexShrink: 1,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
    },
    brandTagText: {
      fontSize: 8,
      letterSpacing: 0.8,
      fontFamily: fonts.sansBold,
      color: c.primary,
      textAlign: 'center',
    },
    sessionCard: {
      minHeight: 84,
      marginTop: 12,
      borderRadius: 16,
      paddingHorizontal: 13,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      backgroundColor: c.primary,
      shadowColor: c.overlay,
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 4,
    },
    sessionCardCompact: {
      minHeight: 74,
      marginTop: 8,
      paddingVertical: 7,
    },
    sessionIconBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionCopy: { flex: 1, gap: 1 },
    sessionKicker: {
      fontSize: 9,
      letterSpacing: 1.2,
      fontFamily: fonts.sansBold,
      color: c.primaryText,
      opacity: 0.72,
    },
    sessionTitle: {
      fontSize: 17,
      fontFamily: fonts.serifBold,
      color: c.primaryText,
    },
    sessionSubtitle: {
      fontSize: 11,
      fontFamily: fonts.sans,
      color: c.primaryText,
      opacity: 0.82,
    },
    sectionHeader: {
      marginTop: 12,
      marginBottom: 7,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: fonts.serifBold,
      color: c.textPrimary,
    },
    sectionMeta: {
      fontSize: 10,
      fontFamily: fonts.sans,
      color: c.textMuted,
    },
    grid: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignContent: 'stretch',
      gap: 8,
    },
    tile: {
      width: '31.5%',
      minHeight: 70,
      flexGrow: 1,
      backgroundColor: c.surface,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      shadowColor: c.overlay,
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    tileWide: {
      width: '100%',
      minHeight: 58,
      flexGrow: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileCopy: { flexGrow: 0, flexShrink: 1 },
    tileLabel: {
      fontSize: 12,
      fontFamily: fonts.sansBold,
      color: c.textPrimary,
      textAlign: 'center',
    },
  });
