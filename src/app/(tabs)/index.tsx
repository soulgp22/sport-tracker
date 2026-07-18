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
import { useTranslation } from '../../i18n/useTranslation';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface HomeTile {
  key: string;
  labelKey: string;
  descriptionKey: string;
  icon: IoniconsName;
  href:
    | '/(tabs)/programs'
    | '/(tabs)/exercises'
    | '/(tabs)/foods'
    | '/(tabs)/nutrition'
    | '/(tabs)/history'
    | '/(tabs)/progress';
}

const HOME_TILES: HomeTile[] = [
  {
    key: 'programs',
    labelKey: 'home.programs',
    descriptionKey: 'home.programsDescription',
    icon: 'barbell-outline',
    href: '/(tabs)/programs',
  },
  {
    key: 'exercises',
    labelKey: 'home.exercises',
    descriptionKey: 'home.exercisesDescription',
    icon: 'body-outline',
    href: '/(tabs)/exercises',
  },
  {
    key: 'nutrition',
    labelKey: 'home.nutrition',
    descriptionKey: 'home.nutritionDescription',
    icon: 'pie-chart-outline',
    href: '/(tabs)/nutrition',
  },
  {
    key: 'foods',
    labelKey: 'home.foods',
    descriptionKey: 'home.foodsDescription',
    icon: 'restaurant-outline',
    href: '/(tabs)/foods',
  },
  {
    key: 'progress',
    labelKey: 'home.progress',
    descriptionKey: 'home.progressDescription',
    icon: 'trending-up-outline',
    href: '/(tabs)/progress',
  },
  {
    key: 'history',
    labelKey: 'home.history',
    descriptionKey: 'home.historyDescription',
    icon: 'time-outline',
    href: '/(tabs)/history',
  },
];

export default function HomeScreen() {
  const c = useColors();
  const { t } = useTranslation();
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
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={t('home.settings')}
            accessibilityHint={t('home.settingsDescription')}>
            <Ionicons name="settings-outline" size={20} color={c.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sessionCard, compact ? styles.sessionCardCompact : null]}
          onPress={() => router.push('/(tabs)/session')}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={active ? t('home.resumeSession') : t('home.startSession')}>
          <View style={styles.sessionIconBox}>
            <Ionicons name={active ? 'refresh' : 'play'} size={21} color={c.primary} />
          </View>
          <View style={styles.sessionCopy}>
            <Text style={styles.sessionKicker}>
              {active ? t('home.activeSession') : t('home.nextEffort')}
            </Text>
            <Text style={styles.sessionTitle}>
              {active ? t('home.resumeSession') : t('home.startSession')}
            </Text>
            <Text style={styles.sessionSubtitle} numberOfLines={1}>
              {active
                ? `${active.programName} · ${active.dayName}`
                : t('home.chooseProgram')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.primaryText} />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.tracking')}</Text>
          <Text style={styles.sectionMeta}>{t('home.allInOne')}</Text>
        </View>

        <View style={styles.grid}>
          {HOME_TILES.map((tile) => {
            return (
              <TouchableOpacity
                key={tile.key}
                style={styles.tile}
                onPress={() => router.push(tile.href as never)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={t(tile.labelKey)}
                accessibilityHint={t(tile.descriptionKey)}>
                <View style={styles.iconBox}>
                  <Ionicons name={tile.icon} size={compact ? 18 : 20} color={c.primary} />
                </View>
                <View style={styles.tileCopy}>
                  <Text style={styles.tileLabel} numberOfLines={1}>
                    {t(tile.labelKey)}
                  </Text>
                </View>
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
    settingsButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
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
      flexGrow: 0,
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
