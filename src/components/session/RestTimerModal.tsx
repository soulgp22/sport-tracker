import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { getRemainingRestSeconds, useActiveSessionStore } from '../../store/activeSessionStore';
import { fonts } from '../../theme/fonts';
import { BRAND_BRASS, type ThemeColors } from '../../theme/palettes';
import { useColors } from '../../theme/useColors';

const RING_SIZE = 248;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface RestTimerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onMinimize: () => void;
  exerciseName?: string;
  currentSetNumber?: number;
  totalSets?: number;
  completedSets?: number;
  targetWeight?: number;
  targetReps?: number;
  previousWeight?: number;
  previousReps?: number;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatWeight(weight: number) {
  return Number.isInteger(weight) ? String(weight) : String(weight).replace('.', ',');
}

export function RestTimerModal({
  visible,
  onDismiss,
  onMinimize,
  exerciseName,
  currentSetNumber,
  totalSets,
  completedSets = 0,
  targetWeight,
  targetReps,
  previousWeight,
  previousReps,
}: RestTimerModalProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const active = useActiveSessionStore((s) => s.active);
  const addRestSeconds = useActiveSessionStore((s) => s.addRestSeconds);
  const skipRest = useActiveSessionStore((s) => s.skipRest);
  const [, setTick] = useState(0);
  const restEndsAt = active?.restEndsAt;
  const ringDuration = useMemo(() => {
    if (!restEndsAt) return 0;
    return Math.max(1, getRemainingRestSeconds(active));
  }, [active, restEndsAt]);

  useEffect(() => {
    if (!visible || !active?.restTimerActive) {
      return undefined;
    }

    const timer = setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(timer);
  }, [visible, active?.restTimerActive]);

  const seconds = getRemainingRestSeconds(active);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = ringDuration > 0 ? Math.min(1, seconds / ringDuration) : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const hasTarget = typeof targetWeight === 'number' && typeof targetReps === 'number';
  const hasPrevious = typeof previousWeight === 'number' && typeof previousReps === 'number';
  const hasSetPosition =
    typeof currentSetNumber === 'number' && typeof totalSets === 'number' && totalSets > 0;

  const adjustRest = (delta: number) => {
    addRestSeconds(delta);
    const remaining = getRemainingRestSeconds(useActiveSessionStore.getState().active);
    if (remaining === 0) onDismiss();
  };

  const skip = () => {
    skipRest();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={skip}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <Text style={styles.restLabel}>REPOS</Text>

          <View style={styles.ringContainer} accessibilityLabel={`Repos restant ${mins} minutes ${secs} secondes`}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={c.surfaceAlt}
                strokeWidth={RING_STROKE}
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={c.primary}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            <View style={styles.timerCenter} pointerEvents="none">
              <Text style={styles.timer}>
                {pad(mins)}:{pad(secs)}
              </Text>
              <Text style={styles.remainingLabel}>RESTANT</Text>
            </View>
          </View>

          {(exerciseName || hasSetPosition || hasTarget || hasPrevious) ? (
            <View style={styles.nextCard}>
              {exerciseName ? <Text style={styles.exerciseName}>{exerciseName}</Text> : null}
              {hasSetPosition ? (
                <Text style={styles.setPosition}>
                  Série {currentSetNumber} / {totalSets}
                </Text>
              ) : null}
              {hasTarget ? (
                <Text style={styles.target}>
                  {formatWeight(targetWeight)} kg × {targetReps} reps
                </Text>
              ) : null}
              {hasPrevious ? (
                <Text style={styles.previous}>
                  Précédente : {formatWeight(previousWeight)} kg × {previousReps} reps
                </Text>
              ) : null}
            </View>
          ) : null}

          {typeof totalSets === 'number' && totalSets > 0 ? (
            <View style={styles.setDots} accessibilityLabel={`${completedSets} séries terminées sur ${totalSets}`}>
              {Array.from({ length: totalSets }, (_, index) => {
                const isCompleted = index < completedSets;
                const isCurrent = index === (currentSetNumber ?? 0) - 1;
                return (
                  <View
                    key={index}
                    style={[
                      styles.setDot,
                      isCompleted && styles.setDotCompleted,
                      isCurrent && styles.setDotCurrent,
                    ]}
                  />
                );
              })}
            </View>
          ) : null}

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => adjustRest(-15)}
              activeOpacity={0.8}
              accessibilityRole="button">
              <Text style={styles.controlLabel}>−15 s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.skipButton]}
              onPress={skip}
              activeOpacity={0.8}
              accessibilityRole="button">
              <Text style={[styles.controlLabel, styles.skipLabel]}>Passer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.minimizeButton]}
              onPress={onMinimize}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Réduire le minuteur">
              <Text style={[styles.controlLabel, styles.minimizeIcon]}>⏬</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => adjustRest(15)}
              activeOpacity={0.8}
              accessibilityRole="button">
              <Text style={styles.controlLabel}>+15 s</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 22,
  },
  restLabel: {
    color: c.primary,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    letterSpacing: 4,
  },
  ringContainer: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  timerCenter: { alignItems: 'center', gap: 4 },
  timer: {
    color: c.textPrimary,
    fontFamily: fonts.serifBold,
    fontSize: 58,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  remainingLabel: {
    color: c.textSecondary,
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  nextCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 4,
  },
  exerciseName: { color: c.textPrimary, fontFamily: fonts.serifBold, fontSize: 21, textAlign: 'center' },
  setPosition: { color: c.primary, fontFamily: fonts.sansBold, fontSize: 14 },
  target: { color: c.textPrimary, fontFamily: fonts.sansBold, fontSize: 18, marginTop: 3 },
  previous: { color: c.textSecondary, fontFamily: fonts.sans, fontSize: 13, marginTop: 5 },
  setDots: {
    maxWidth: 420,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  setDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.surfaceAlt },
  setDotCompleted: { backgroundColor: c.primary },
  setDotCurrent: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: BRAND_BRASS,
    borderWidth: 2,
    borderColor: c.surface,
  },
  controls: { width: '100%', maxWidth: 420, flexDirection: 'row', gap: 10 },
  controlButton: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  skipButton: { backgroundColor: c.primary, borderColor: c.primary },
  controlLabel: { color: c.textPrimary, fontFamily: fonts.sansBold, fontSize: 15 },
  skipLabel: { color: c.primaryText },
  minimizeButton: { backgroundColor: c.surfaceAlt, borderColor: c.border },
  minimizeIcon: { fontSize: 18 },
});
