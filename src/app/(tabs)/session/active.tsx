import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useActiveSessionStore } from '../../../store/activeSessionStore';
import { useSessionStore } from '../../../store/sessionStore';
import { useRestTimer } from '../../../hooks/useRestTimer';
import { RestTimerModal } from '../../../components/session/RestTimerModal';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ActiveSessionScreen() {
  const router = useRouter();
  const active = useActiveSessionStore((s) => s.active);
  const logSet = useActiveSessionStore((s) => s.logSet);
  const setRestTimer = useActiveSessionStore((s) => s.setRestTimer);
  const restTimerActive = useActiveSessionStore((s) => s.active?.restTimerActive ?? false);
  const restSecondsRemaining = useActiveSessionStore((s) => s.active?.restSecondsRemaining ?? 0);
  const finishSession = useActiveSessionStore((s) => s.finishSession);
  const cancelSession = useActiveSessionStore((s) => s.cancelSession);
  const addSession = useSessionStore((s) => s.addSession);

  useRestTimer();

  const [elapsed, setElapsed] = useState(0);
  const [showRestModal, setShowRestModal] = useState(false);

  useEffect(() => {
    if (!active) return;
    const start = new Date(active.startedAt).getTime();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active]);

  // Show rest modal when timer starts
  useEffect(() => {
    if (restTimerActive) setShowRestModal(true);
    else setShowRestModal(false);
  }, [restTimerActive]);

  if (!active) {
    router.replace('/(tabs)/session');
    return null;
  }

  const exIdx = active.currentExerciseIndex;
  const setIdx = active.currentSetIndex;
  const currentEx = active.exercises[exIdx];
  const currentSet = currentEx?.sets[setIdx];

  const [reps, setReps] = useState(String(currentSet?.targetReps ?? 0));
  const [weight, setWeight] = useState(String(currentSet?.targetWeight ?? 0));

  // Reset inputs when pointer advances
  useEffect(() => {
    const ex = active.exercises[active.currentExerciseIndex];
    const s = ex?.sets[active.currentSetIndex];
    if (s) {
      setReps(String(s.targetReps));
      setWeight(String(s.targetWeight));
    }
  }, [active.currentExerciseIndex, active.currentSetIndex]);

  const isLastSet = setIdx >= (currentEx?.sets.length ?? 0) - 1;
  const isLastExercise = exIdx >= active.exercises.length - 1;
  const allDone = isLastExercise && isLastSet;

  const handleLogSet = () => {
    if (!currentSet) return;
    const actualReps = parseInt(reps) || 0;
    const actualWeight = parseFloat(weight) || 0;
    const restSecs = currentSet.targetRestSeconds || 90;
    logSet(exIdx, setIdx, actualReps, actualWeight);
    setRestTimer(restSecs);
  };

  const handleFinish = () => {
    Alert.alert('Terminer la séance ?', 'Les séries non logguées seront ignorées.', [
      { text: 'Continuer', style: 'cancel' },
      {
        text: 'Terminer',
        style: 'destructive',
        onPress: () => {
          const session = finishSession();
          if (session) addSession(session);
          router.replace('/(tabs)/history');
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Abandonner ?', 'La séance sera perdue.', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: () => { cancelSession(); router.replace('/(tabs)/session'); } },
    ]);
  };

  const completedSets = active.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = active.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleCancel} hitSlop={8}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View style={styles.topCenter}>
            <Text style={styles.topTitle}>{active.programName}</Text>
            <Text style={styles.topSub}>{active.dayName} · {fmt(elapsed)}</Text>
          </View>
          <TouchableOpacity onPress={handleFinish} hitSlop={8}>
            <Text style={styles.finishLink}>Terminer</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{completedSets}/{totalSets} séries</Text>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Exercise list */}
          {active.exercises.map((ex, ei) => (
            <View key={ei} style={[styles.exSection, ei === exIdx && styles.exSectionActive]}>
              <Text style={[styles.exName, ei === exIdx && styles.exNameActive]}>{ex.exerciseName || `Exercice ${ei + 1}`}</Text>
              <View style={styles.setsRow}>
                {ex.sets.map((s, si) => {
                  const isActive = ei === exIdx && si === setIdx;
                  const isDone = s.completed;
                  return (
                    <View
                      key={si}
                      style={[
                        styles.setBubble,
                        isDone && styles.setBubbleDone,
                        isActive && styles.setBubbleActive,
                      ]}>
                      <Text style={[styles.setBubbleText, isDone && styles.setBubbleTextDone, isActive && styles.setBubbleTextActive]}>
                        {si + 1}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Log form */}
          {currentEx && currentSet && (
            <View style={styles.logCard}>
              <Text style={styles.logTitle}>
                {currentEx.exerciseName || 'Exercice'} — Série {setIdx + 1}/{currentEx.sets.length}
              </Text>
              <View style={styles.logRow}>
                <View style={styles.logField}>
                  <Text style={styles.logFieldLabel}>Reps</Text>
                  <TextInput
                    value={reps}
                    onChangeText={setReps}
                    keyboardType="numeric"
                    selectTextOnFocus
                    style={styles.logInput}
                  />
                </View>
                <View style={styles.logField}>
                  <Text style={styles.logFieldLabel}>Poids (kg)</Text>
                  <TextInput
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    style={styles.logInput}
                  />
                </View>
              </View>
              <Button
                title={allDone ? 'Dernière série — Terminer' : `Logger la série ${setIdx + 1}`}
                onPress={allDone ? handleFinish : handleLogSet}
                style={styles.logBtn}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <RestTimerModal visible={showRestModal} onDismiss={() => setShowRestModal(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  topSub: { fontSize: 13, color: '#6b7280' },
  finishLink: { fontSize: 15, fontWeight: '600', color: '#2563eb' },
  progressTrack: { height: 4, backgroundColor: '#e5e7eb', marginHorizontal: 16 },
  progressFill: { height: 4, backgroundColor: '#2563eb', borderRadius: 2 },
  progressLabel: { fontSize: 12, color: '#6b7280', textAlign: 'right', paddingHorizontal: 16, marginTop: 2 },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  exSection: { backgroundColor: '#fff', borderRadius: 10, padding: 12, opacity: 0.5 },
  exSectionActive: { opacity: 1, borderWidth: 2, borderColor: '#2563eb' },
  exName: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  exNameActive: { color: '#111827', fontSize: 16 },
  setsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  setBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBubbleDone: { backgroundColor: '#2563eb' },
  setBubbleActive: { backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#2563eb' },
  setBubbleText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  setBubbleTextDone: { color: '#fff' },
  setBubbleTextActive: { color: '#2563eb' },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  logRow: { flexDirection: 'row', gap: 12 },
  logField: { flex: 1, gap: 4 },
  logFieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' },
  logInput: { textAlign: 'center', fontSize: 20, fontWeight: '700' },
  logBtn: { marginTop: 4 },
});
