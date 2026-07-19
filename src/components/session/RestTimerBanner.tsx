import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getRemainingRestSeconds, useActiveSessionStore } from '../../store/activeSessionStore';
import { fonts } from '../../theme/fonts';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';

export function RestTimerBanner() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);
  const restTimerActive = useActiveSessionStore((s) => s.active?.restTimerActive ?? false);
  const restTimerMinimized = useActiveSessionStore((s) => s.active?.restTimerMinimized ?? false);
  const restoreRestTimer = useActiveSessionStore((s) => s.restoreRestTimer);
  const [, setTick] = useState(0);

  // Force re-render every second so the displayed time stays in sync.
  // The remaining seconds are derived from restEndsAt (absolute timestamp),
  // so there is no drift or reset regardless of re-renders.
  useEffect(() => {
    if (!restTimerActive || !restTimerMinimized) return undefined;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [restTimerActive, restTimerMinimized]);

  if (!restTimerActive || !restTimerMinimized) return null;

  const seconds = getRemainingRestSeconds(useActiveSessionStore.getState().active);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={restoreRestTimer}
      style={[styles.banner, { paddingTop: insets.top + 4 }]}
      accessibilityRole="button"
      accessibilityLabel={`Repos : ${mm}:${ss} — Appuyer pour rouvrir`}>
      <Text style={styles.label}>⏱ {mm}:{ss}</Text>
      <Text style={styles.hint}>Appuyer pour rouvrir</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    banner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      backgroundColor: c.primary,
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    label: {
      color: c.primaryText,
      fontFamily: fonts.serifBold,
      fontSize: 17,
      fontVariant: ['tabular-nums'],
    },
    hint: {
      color: c.primaryText,
      fontFamily: fonts.sans,
      fontSize: 11,
      opacity: 0.8,
    },
  });
