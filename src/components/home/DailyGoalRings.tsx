import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTranslation } from '../../i18n/useTranslation';
import type { DailyGoalsSnapshot, GoalRingState } from '../../lib/dailyGoals';
import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import { spacing } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';

const RING_SIZE = 84;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface GoalRingProps {
  state: GoalRingState;
  label: string;
  /** Texte au centre quand la donnee manque (« Connecter », « Profil »). */
  unavailableLabel: string;
  color: string;
  formatValue: (value: number) => string;
  onPress: () => void;
  testID: string;
}

function GoalRing({ state, label, unavailableLabel, color, formatValue, onPress, testID }: GoalRingProps) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);

  const ratio = state.kind === 'progress' ? state.ratio : 0;
  const reached = state.kind === 'progress' && state.reached;
  // Meme construction que l'anneau du minuteur de repos (RestTimerModal).
  const dashOffset = RING_CIRCUMFERENCE * (1 - ratio);
  const strokeColor = reached ? c.tertiary : color;
  const goalText = formatValue(state.goal);
  const a11y =
    state.kind === 'progress'
      ? t('goals.progressA11y', { label, value: formatValue(state.value), goal: goalText })
      : t('goals.unavailableA11y', { label });

  return (
    <TouchableOpacity
      style={styles.ring}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      testID={testID}>
      <View style={styles.ringCanvas}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={c.surfaceAlt}
            strokeWidth={RING_STROKE}
          />
          {ratio > 0 ? (
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={strokeColor}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          ) : null}
        </Svg>
        <View style={styles.ringCenter} pointerEvents="none">
          {state.kind === 'progress' ? (
            <>
              <Text
                style={[styles.ringValue, reached ? { color: c.tertiary } : null]}
                numberOfLines={1}
                testID={`${testID}-value`}>
                {formatValue(state.value)}
              </Text>
              <Text style={styles.ringGoal} numberOfLines={1}>
                {t('goals.ofGoal', { goal: goalText })}
              </Text>
            </>
          ) : (
            <Text style={styles.ringUnavailable} numberOfLines={1} testID={`${testID}-unavailable`}>
              {unavailableLabel}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.ringLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export interface DailyGoalRingsProps {
  snapshot: DailyGoalsSnapshot;
  /**
   * Pourquoi la depense est inconnue : profil incomplet (« Profil ») ou
   * aucune donnee d'activite du jour (« Connecter »).
   */
  activeKcalUnavailableReason: 'profile' | 'data';
  formatInteger: (value: number) => string;
  onPressSteps: () => void;
  onPressSessions: () => void;
  onPressActiveKcal: () => void;
  onPressAdjust: () => void;
}

/**
 * Bloc « Objectifs du jour » de l'accueil : trois anneaux (pas, seances de la
 * semaine, depense active). Composant d'affichage pur : la progression vient
 * de `buildDailyGoalsSnapshot`, partagee avec le widget Android.
 */
export function DailyGoalRings({
  snapshot,
  activeKcalUnavailableReason,
  formatInteger,
  onPressSteps,
  onPressSessions,
  onPressActiveKcal,
  onPressAdjust,
}: DailyGoalRingsProps) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.block} testID="home-daily-goals">
      <View style={styles.header}>
        <Text style={styles.title}>{t('goals.title')}</Text>
        <TouchableOpacity
          onPress={onPressAdjust}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('goals.adjust')}
          testID="home-daily-goals-adjust">
          <Text style={styles.adjust}>{t('goals.adjust')} ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.rings}>
        <GoalRing
          state={snapshot.steps}
          label={t('goals.steps')}
          unavailableLabel={t('goals.connect')}
          color={c.secondary}
          formatValue={formatInteger}
          onPress={onPressSteps}
          testID="home-goal-steps"
        />
        <GoalRing
          state={snapshot.sessions}
          label={t('goals.sessionsWeek')}
          unavailableLabel="—"
          color={c.primary}
          formatValue={formatInteger}
          onPress={onPressSessions}
          testID="home-goal-sessions"
        />
        <GoalRing
          state={snapshot.activeKcal}
          label={t('goals.activeKcal')}
          unavailableLabel={
            activeKcalUnavailableReason === 'profile' ? t('goals.completeProfile') : t('goals.connect')
          }
          color={c.tertiary}
          formatValue={formatInteger}
          onPress={onPressActiveKcal}
          testID="home-goal-active-kcal"
        />
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    block: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 2,
      borderBottomColor: c.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    title: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.66,
      textTransform: 'uppercase',
      color: c.textMuted,
    },
    adjust: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.88,
      textTransform: 'uppercase',
      color: c.primary,
    },
    rings: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    ring: { width: 100, alignItems: 'center' },
    ringCanvas: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
    ringCenter: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringValue: {
      fontFamily: fonts.displayHeavy,
      fontSize: 18,
      lineHeight: 20,
      color: c.textPrimary,
    },
    ringGoal: {
      fontFamily: fonts.sans,
      fontSize: 9,
      lineHeight: 12,
      color: c.textMuted,
    },
    ringUnavailable: {
      fontFamily: fonts.sansSemi,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: c.secondary,
    },
    ringLabel: {
      fontFamily: fonts.sans,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: c.textMuted,
      marginTop: 6,
      textAlign: 'center',
    },
  });
