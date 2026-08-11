import { useEffect, useMemo, useState } from 'react';
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
import { Card } from '../../components/ui/Card';
import { canUseMealPhoto } from '../../lib/mealPhotoCapability';
import { calculateConsistencyMetrics } from '../../lib/performanceEngine';
import { useActiveSessionStore } from '../../store/activeSessionStore';
import { usePerformanceStore } from '../../store/performanceStore';
import { useSessionStore } from '../../store/sessionStore';
import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import {
  makeShadows,
  makeTypeScale,
  radius,
  spacing,
  type ShadowSet,
  type TypeScale,
} from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { useTranslation } from '../../i18n/useTranslation';
import { HOME_TILES } from '../../constants/homeTiles';


export default function HomeScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c, makeShadows(c), makeTypeScale()), [c]);
  const router = useRouter();
  const active = useActiveSessionStore((state) => state.active);
  const sessions = useSessionStore((state) => state.sessions);
  const weeklyGoal = usePerformanceStore((state) => state.weeklySessionGoal);
  const monthlyGoal = usePerformanceStore((state) => state.monthlySessionGoal);
  const { height, width } = useWindowDimensions();
  const compact = height < 700;
  const tileWidth = Math.floor((width - spacing.md * 2 - spacing.sm) / 2);
  const [animations] = useState(() => HOME_TILES.map(() => new Animated.Value(0)));
  const [sessionAnimation] = useState(() => new Animated.Value(0));
  const [photoScanAvailable, setPhotoScanAvailable] = useState(false);

  // Bouton « scan de repas » : visible uniquement sur Android compatible quand
  // la configuration du serveur d'analyse est complète.
  useEffect(() => {
    let mounted = true;
    void canUseMealPhoto().then((capability) => {
      if (mounted && capability.ok) setPhotoScanAvailable(true);
    });
    return () => {
      mounted = false;
    };
  }, []);
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.content, compact ? styles.contentCompact : null]}>
        <View style={styles.brandRow}>
          <LifeSportLogo />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/(tabs)/profile' as never)}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={t('home.profile')}
              accessibilityHint={t('home.profileHint')}>
              <Ionicons name="person-circle-outline" size={21} color={c.textPrimary} />
            </TouchableOpacity>
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

        {photoScanAvailable ? (
          <Card
            onPress={() => router.push('/(tabs)/nutrition/photo' as never)}
            accessibilityLabel={t('home.scanMeal')}
            accessibilityHint={t('home.scanMealDescription')}
            style={[styles.mealScanCard, compact ? styles.mealScanCardCompact : null]}>
            <View style={styles.mealScanIconBox}>
              <Ionicons name="camera" size={24} color={c.primary} />
            </View>
            <View style={styles.sessionCopy}>
              <Text style={styles.mealScanKicker}>{t('home.scanMealKicker')}</Text>
              <Text style={styles.mealScanTitle}>{t('home.scanMeal')}</Text>
              <Text style={styles.mealScanSubtitle} numberOfLines={1}>
                {t('home.scanMealDescription')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
          </Card>
        ) : null}

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
                opacity: animations[index],
                transform: [{ translateY: animations[index].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
              }}>
              <Card
                onPress={() => router.push(tile.href as never)}
                accessibilityLabel={t(tile.labelKey)}
                accessibilityHint={t(tile.descriptionKey)}
                style={[styles.tile, compact ? styles.tileCompact : null]}>
                <View style={[styles.tileAccent, { backgroundColor: c[tile.accent] }]} />
                <View style={[styles.iconBox, { backgroundColor: `${c[tile.accent]}1A` }]}>
                  <Ionicons name={tile.icon} size={compact ? 19 : 22} color={c[tile.accent]} />
                </View>
                <View style={styles.tileCopy}>
                  <Text style={styles.tileLabel} numberOfLines={1}>{t(tile.labelKey)}</Text>
                  <Text style={styles.tileDescription} numberOfLines={compact ? 1 : 2}>
                    {t(tile.descriptionKey)}
                  </Text>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors, shadows: ShadowSet, type: TypeScale) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
    contentCompact: { paddingTop: spacing.xxs },
    brandRow: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    sessionCard: {
      minHeight: 96,
      marginTop: spacing.sm,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      overflow: 'hidden',
      ...shadows.raised,
    },
    sessionCardCompact: { minHeight: 80, paddingVertical: spacing.sm },
    heroOrbTop: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: -40, top: -62, backgroundColor: 'rgba(255,255,255,0.10)' },
    heroOrbBottom: { position: 'absolute', width: 72, height: 72, borderRadius: 36, right: 52, bottom: -50, backgroundColor: 'rgba(255,255,255,0.08)' },
    sessionIconBox: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    sessionCopy: { flex: 1, minWidth: 0, gap: 2 },
    sessionKicker: { ...type.tiny, color: c.primaryText, opacity: 0.76 },
    sessionTitle: { ...type.title, fontFamily: fonts.sansHeavy, color: c.primaryText },
    sessionSubtitle: { ...type.micro, fontFamily: fonts.sans, color: c.primaryText, opacity: 0.84 },
    sessionArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
    sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    sectionEyebrow: { ...type.tiny, color: c.primary },
    sectionTitle: { ...type.title, color: c.textPrimary },
    goalPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.accentSoft },
    goalPillText: { ...type.micro, fontFamily: fonts.sansBold, color: c.primary },
    grid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: spacing.sm },
    tile: {
      minHeight: 84,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      overflow: 'hidden',
    },
    tileCompact: { minHeight: 72, paddingVertical: spacing.xs },
    tileAccent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
    iconBox: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    tileCopy: { flex: 1, minWidth: 0, gap: 2 },
    tileLabel: { ...type.micro, fontFamily: fonts.sansBold, fontSize: 13, color: c.textPrimary },
    tileDescription: { ...type.tiny, fontFamily: fonts.sans, letterSpacing: 0, textTransform: 'none', color: c.textMuted },
    mealScanCard: {
      marginTop: spacing.sm,
      minHeight: 92,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    mealScanCardCompact: { minHeight: 80, paddingVertical: spacing.sm },
    mealScanIconBox: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
    mealScanKicker: { ...type.tiny, color: c.primary },
    mealScanTitle: { ...type.subtitle, fontFamily: fonts.sansHeavy, color: c.textPrimary },
    mealScanSubtitle: { ...type.micro, fontFamily: fonts.sans, color: c.textSecondary },
  });
