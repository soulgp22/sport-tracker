import { useMemo } from 'react';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRemainingRestSeconds, useActiveSessionStore } from '../../store/activeSessionStore';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';

interface RestTimerModalProps {
  visible: boolean;
  onDismiss: () => void;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function RestTimerModal({ visible, onDismiss }: RestTimerModalProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const active = useActiveSessionStore((s) => s.active);
  const clearTimer = useActiveSessionStore((s) => s.clearRestTimer);
  const [, setTick] = useState(0);

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

  const skip = () => {
    clearTimer();
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={skip}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons name="timer-outline" size={36} color={c.primary} />
          <Text style={styles.label}>Repos</Text>
          <Text style={styles.timer}>
            {pad(mins)}:{pad(secs)}
          </Text>
          <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.8}>
            <Text style={styles.skipLabel}>Passer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    gap: 12,
    width: 260,
  },
  label: { fontSize: 16, color: c.textSecondary, fontWeight: '500' },
  timer: { fontSize: 56, fontWeight: '700', color: c.textPrimary, letterSpacing: -1 },
  skipBtn: {
    marginTop: 8,
    backgroundColor: c.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  skipLabel: { fontSize: 16, fontWeight: '600', color: c.textPrimary },
});
