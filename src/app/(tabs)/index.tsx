import { useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LifeSportLogo } from '../../components/brand/LifeSportLogo';
import { calculateConsistencyMetrics } from '../../lib/performanceEngine';
import { useActiveSessionStore } from '../../store/activeSessionStore';
import { usePerformanceStore } from '../../store/performanceStore';
import { useSessionStore } from '../../store/sessionStore';
import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import { useColors } from '../../theme/useColors';
import { useTranslation } from '../../i18n/useTranslation';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface HomeTile {
  key: string;
  labelKey: string;
  descriptionKey: string;
  icon: IoniconsName;
  accent: string;
  href:
    | '/(tabs)/programs'
    | '/(tabs)/exercises'
    | '/(tabs)/foods'
    | '/(tabs)/nutrition'
    | '/(tabs)/history'
    | '/(tabs)/progress';
}

const HOME_TILES: HomeTile[] = [
  { key: 'programs', labelKey: 'home.programs', descriptionKey: 'home.programsDescription', icon: 'barbell', accent: '#2563EB', href: '/(tabs)/programs' },
  { key: 'exercises', labelKey: 'home.exercises', descriptionKey: 'home.exercisesDescription', icon: 'accessibility', accent: '#8B5CF6', href: '/(tabs)/exercises' },
  { key: 'nutrition', labelKey: 'home.nutrition', descriptionKey: 'home.nutritionDescription', icon: 'nutrition', accent: '#10B981', href: '/(tabs)/nutrition' },
  { key: 'foods', labelKey: 'home.foods', descriptionKey: 'home.foodsDescription', icon: 'fast-food', accent: '#F59E0B', href: '/(tabs)/foods' },
  { key: 'progress', labelKey: 'home.progress', descriptionKey: 'home.progressDescription', icon: 'analytics', accent: '#F43F5E', href: '/(tabs)/progress' },
  { key: 'history', labelKey: 'home.history', descriptionKey: 'home.historyDescription', icon: 'pulse', accent: '#06B6D4', href: '/(tabs)/history' },
];

export default function HomeScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const active = useActiveSessionStore((state) => state.active);
  const sessions = useSessionStore((state) => state.sessions);
  const weeklyGoal = usePerformanceStore((state) => state.weeklySessionGoal);
  const monthlyGoal = usePerformanceStore((state) => state.monthlySessionGoal);
  const { height, width } = useWindowDimensions();
  const compact = height < 700;
  const tileWidth = Math.floor((width - 38) / 2);
  const [animations] = useState(() => HOME_TILES.map(() => new Animated.Value(0)));
  const [sessionAnimation] = useState(() => new Animated.Value(0));
  const consistency = useMemo(
    () => calculateConsistencyMetrics(sessions, weeklyGoal, monthlyGoal),
    [monthlyGoal, sessions, weeklyGoal]
  );

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        sessionAnimation.setValue(1);
        animations.forEach((value) => value.setValue(1));
        return;
      }

      Animated.parallel([
        Animated.timing(sessionAnimation, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.stagger(
          55,
          animations.map((value) => Animated.timing(value, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }))
        ),
      ]).start();
    });
    return () => {
      cancelled = true;
    };
  }, [animations, sessionAnimation]);

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
            <Ionicons name="options-outline" size={21} color={c.textPrimary} />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={{
            opacity: sessionAnimation,
            transform: [{ translateY: sessionAnimation.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/session')}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={active ? t('home.resumeSession') : t('home.startSession')}>
            <LinearGradient
              colors={[c.primary, c.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.sessionCard, compact ? styles.sessionCardCompact : null]}>
              <View style={styles.heroOrbTop} />
              <View style={styles.heroOrbBottom} />
              <View style={styles.sessionIconBox}>
                <Ionicons name={active ? 'refresh' : 'play'} size={22} color={c.primary} />
              </View>
              <View style={styles.sessionCopy}>
                <Text style={styles.sessionKicker}>
                  {active ? t('home.activeSession') : t('home.nextEffort')}
                </Text>
                <Text style={styles.sessionTitle}>
                  {active ? t('home.resumeSession') : t('home.startSession')}
                </Text>
                <Text style={styles.sessionSubtitle} numberOfLines={1}>
                  {active ? `${active.programName} · ${active.dayName}` : t('home.chooseProgram')}
                </Text>
              </View>
              <View style={styles.sessionArrow}>
                <Ionicons name="arrow-forward" size={19} color={c.primaryText} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>{t('home.allInOne')}</Text>
            <Text style={styles.sectionTitle}>{t('home.tracking')}</Text>
          </View>
          <View style={styles.goalPill}>
            <Ionicons name="flame" size={14} color={c.primary} />
            <Text style={styles.goalPillText}>{consistency.thisWeek}/{weeklyGoal}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {HOME_TILES.map((tile, index) => (
            <Animated.View
              key={tile.key}
              style={{
                width: tileWidth,
                height: '31.5%',
                opacity: animations[index],
                transform: [{ translateY: animations[index].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
              }}>
              <TouchableOpacity
                style={[styles.tile, compact ? styles.tileCompact : null]}
                onPress={() => router.push(tile.href as never)}
                activeOpacity={0.76}
                accessibilityRole="button"
                accessibilityLabel={t(tile.labelKey)}
                accessibilityHint={t(tile.descriptionKey)}>
                <View style={[styles.tileAccent, { backgroundColor: tile.accent }]} />
                <View style={[styles.iconBox, { backgroundColor: `${tile.accent}1A` }]}>
                  <Ionicons name={tile.icon} size={compact ? 19 : 22} color={tile.accent} />
                </View>
                <View style={styles.tileCopy}>
                  <Text style={styles.tileLabel} numberOfLines={1}>{t(tile.labelKey)}</Text>
                  <Text style={styles.tileDescription} numberOfLines={compact ? 1 : 2}>
                    {t(tile.descriptionKey)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={c.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: { flex: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },
  contentCompact: { paddingTop: 5, paddingBottom: 6 },
  brandRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.overlay,
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  sessionCard: {
    minHeight: 94,
    marginTop: 11,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    shadowColor: c.overlay,
    shadowOpacity: 0.2,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  sessionCardCompact: { minHeight: 80, marginTop: 7, paddingVertical: 9 },
  heroOrbTop: { position: 'absolute', width: 110, height: 110, borderRadius: 55, right: -36, top: -58, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroOrbBottom: { position: 'absolute', width: 70, height: 70, borderRadius: 35, right: 48, bottom: -48, backgroundColor: 'rgba(255,255,255,0.08)' },
  sessionIconBox: { width: 46, height: 46, borderRadius: 16, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  sessionCopy: { flex: 1, minWidth: 0, gap: 1 },
  sessionKicker: { fontSize: 9, letterSpacing: 1.4, fontFamily: fonts.sansBold, color: c.primaryText, opacity: 0.76 },
  sessionTitle: { fontSize: 19, fontFamily: fonts.sansHeavy, color: c.primaryText },
  sessionSubtitle: { fontSize: 11, fontFamily: fonts.sans, color: c.primaryText, opacity: 0.84 },
  sessionArrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  sectionHeader: { marginTop: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { fontSize: 9, letterSpacing: 1.2, fontFamily: fonts.sansBold, color: c.primary, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 19, lineHeight: 22, fontFamily: fonts.sansHeavy, color: c.textPrimary },
  goalPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: c.accentSoft },
  goalPillText: { fontSize: 11, fontFamily: fonts.sansBold, color: c.primary },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'stretch', justifyContent: 'space-between', rowGap: 8 },
  tile: {
    width: '100%',
    height: '100%',
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    overflow: 'hidden',
    shadowColor: c.overlay,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tileCompact: { minHeight: 64, paddingVertical: 6 },
  tileAccent: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  iconBox: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tileCopy: { flex: 1, minWidth: 0, gap: 2 },
  tileLabel: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textPrimary },
  tileDescription: { fontSize: 9.5, lineHeight: 12, fontFamily: fonts.sans, color: c.textMuted },
});
