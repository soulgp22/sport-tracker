import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { ExerciseDetailView } from '../../../components/exercises/ExerciseDetailView';
import { ExerciseThumbnail } from '../../../components/exercises/ExerciseThumbnail';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';
import { useExerciseCatalogStore } from '../../../store/exerciseCatalogStore';
import type { LoggedSet, SessionExercise } from '../../../types';

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function SessionLogBar({
  exercise,
  loggedSet,
  setIndex,
  onSubmit,
}: {
  exercise: SessionExercise;
  loggedSet: LoggedSet;
  setIndex: number;
  onSubmit: (actualReps: number, actualWeight: number) => void;
}) {
  const [reps, setReps] = useState(() =>
    String(loggedSet.completed ? loggedSet.actualReps : loggedSet.targetReps)
  );
  const [weight, setWeight] = useState(() =>
    String(loggedSet.completed ? loggedSet.actualWeight : loggedSet.targetWeight)
  );

  const handleSubmit = () => {
    onSubmit(parseInt(reps, 10) || 0, parseFloat(weight) || 0);
  };

  return (
    <View style={styles.logBar}>
      <Text style={styles.logTitle} numberOfLines={1}>
        {exercise.exerciseName} — Série {setIndex + 1}/{exercise.sets.length}
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
        <Button
          title={loggedSet.completed ? 'Modifier' : 'Logger'}
          onPress={handleSubmit}
          style={styles.logBtn}
        />
      </View>
    </View>
  );
}

export default function ActiveSessionScreen() {
  const router = useRouter();
  const active = useActiveSessionStore((s) => s.active);
  const logSet = useActiveSessionStore((s) => s.logSet);
  const setRestTimer = useActiveSessionStore((s) => s.setRestTimer);
  const setActivePointer = useActiveSessionStore((s) => s.setActivePointer);
  const swapExercise = useActiveSessionStore((s) => s.swapExercise);
  const restTimerActive = useActiveSessionStore((s) => s.active?.restTimerActive ?? false);
  const finishSession = useActiveSessionStore((s) => s.finishSession);
  const cancelSession = useActiveSessionStore((s) => s.cancelSession);
  const addSession = useSessionStore((s) => s.addSession);
  const getCatalogExercise = useExerciseCatalogStore((s) => s.getById);

  useRestTimer();

  const [elapsed, setElapsed] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [replacementExerciseIndex, setReplacementExerciseIndex] = useState<number | null>(null);

  const exIdx = active?.currentExerciseIndex ?? 0;
  const setIdx = active?.currentSetIndex ?? 0;
  const currentEx = active?.exercises[exIdx];
  const currentSet = currentEx?.sets[setIdx];

  // Redirige si plus de séance active (dans un effet, jamais pendant le render)
  useEffect(() => {
    if (!active) router.replace('/(tabs)/session');
  }, [active, router]);

  // Chrono
  useEffect(() => {
    if (!active) return;
    const start = new Date(active.startedAt).getTime();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active]);

  if (!active || !currentEx || !currentSet) return null;

  const completedSets = active.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = active.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  const selectExercise = (ei: number) => {
    const ex = active.exercises[ei];
    const firstPending = ex.sets.findIndex((s) => !s.completed);
    setActivePointer(ei, firstPending < 0 ? ex.sets.length - 1 : firstPending);
  };

  const handleLogSet = (actualReps: number, actualWeight: number) => {
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

  const replacementExercise =
    replacementExerciseIndex !== null ? active.exercises[replacementExerciseIndex] : null;
  const replacementAlternatives = replacementExercise?.alternativeExerciseIds ?? [];

  const closeReplacementModal = () => {
    setReplacementExerciseIndex(null);
  };

  const handleSwapExercise = (alternativeId: string) => {
    if (replacementExerciseIndex === null) return;
    swapExercise(replacementExerciseIndex, alternativeId);
    closeReplacementModal();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleCancel} hitSlop={8}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View style={styles.topCenter}>
            <Text style={styles.topTitle} numberOfLines={1}>{active.programName}</Text>
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
        <Text style={styles.progressLabel}>{completedSets}/{totalSets} séries · appuie sur un exercice pour le faire dans l&apos;ordre que tu veux</Text>

        {/* Exercise list (ordre libre : tape un exo ou une série) */}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {active.exercises.map((ex, ei) => {
            const exDone = ex.sets.every((s) => s.completed);
            const isCurrentEx = ei === exIdx;
            const hasAlternatives = (ex.alternativeExerciseIds?.length ?? 0) > 0;
            return (
              <TouchableOpacity
                key={ei}
                activeOpacity={0.85}
                onPress={() => selectExercise(ei)}
                style={[styles.exSection, isCurrentEx && styles.exSectionActive]}>
                <View style={styles.exRow}>
                  <Text style={[styles.exName, isCurrentEx && styles.exNameActive]} numberOfLines={1}>
                    {ex.exerciseName || `Exercice ${ei + 1}`}
                  </Text>
                  {exDone ? <Ionicons name="checkmark-circle" size={18} color="#16a34a" /> : null}
                  {hasAlternatives ? (
                    <TouchableOpacity
                      onPress={(event) => {
                        event.stopPropagation();
                        setReplacementExerciseIndex(ei);
                      }}
                      hitSlop={8}
                      style={styles.replaceBtn}>
                      <Ionicons name="swap-horizontal" size={16} color="#2563eb" />
                      <Text style={styles.replaceLabel}>Remplacer</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={() => setDetailId(ex.exerciseId)} hitSlop={8} style={styles.infoBtn}>
                    <Ionicons name="information-circle-outline" size={20} color="#2563eb" />
                  </TouchableOpacity>
                </View>
                <View style={styles.setsRow}>
                  {ex.sets.map((s, si) => {
                    const isActive = ei === exIdx && si === setIdx;
                    return (
                      <TouchableOpacity
                        key={si}
                        onPress={() => setActivePointer(ei, si)}
                        style={[styles.setBubble, s.completed && styles.setBubbleDone, isActive && styles.setBubbleActive]}>
                        <Text style={[styles.setBubbleText, s.completed && styles.setBubbleTextDone, isActive && styles.setBubbleTextActive]}>
                          {si + 1}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Barre de log FIXE en bas — toujours accessible */}
        <SessionLogBar
          key={`${currentEx.exerciseId}-${exIdx}-${setIdx}-${currentSet.completedAt ?? 'pending'}`}
          exercise={currentEx}
          loggedSet={currentSet}
          setIndex={setIdx}
          onSubmit={handleLogSet}
        />
      </KeyboardAvoidingView>

      <RestTimerModal visible={restTimerActive} onDismiss={() => {}} />

      <Modal visible={!!detailId} animationType="slide" onRequestClose={() => setDetailId(null)}>
        {detailId ? <ExerciseDetailView id={detailId} onClose={() => setDetailId(null)} /> : null}
      </Modal>

      <Modal
        visible={replacementExerciseIndex !== null}
        animationType="slide"
        onRequestClose={closeReplacementModal}>
        <SafeAreaView style={styles.replacementSafe} edges={['top', 'bottom']}>
          <View style={styles.replacementHeader}>
            <TouchableOpacity onPress={closeReplacementModal} hitSlop={8}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.replacementTitle}>Remplacer l&apos;exercice</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.replacementList}>
            {replacementAlternatives.map((alternativeId) => {
              const alternative = getCatalogExercise(alternativeId);
              const selected = alternativeId === replacementExercise?.exerciseId;
              return (
                <TouchableOpacity
                  key={alternativeId}
                  style={[styles.replacementRow, selected && styles.replacementRowSelected]}
                  onPress={() => handleSwapExercise(alternativeId)}
                  activeOpacity={0.75}>
                  <ExerciseThumbnail id={alternativeId} size={54} />
                  <View style={styles.replacementBody}>
                    <Text style={styles.replacementName} numberOfLines={2}>
                      {alternative?.name ?? 'Exercice inconnu'}
                    </Text>
                    {alternative ? (
                      <Text style={styles.replacementMeta} numberOfLines={1}>
                        {alternative.target} · {alternative.equipment}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'chevron-forward'}
                    size={20}
                    color={selected ? '#2563eb' : '#9ca3af'}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  topSub: { fontSize: 13, color: '#6b7280' },
  finishLink: { fontSize: 15, fontWeight: '600', color: '#2563eb' },
  progressTrack: { height: 4, backgroundColor: '#e5e7eb', marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#2563eb', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: '#9ca3af', paddingHorizontal: 16, marginTop: 4 },
  content: { padding: 16, gap: 8, paddingBottom: 16 },
  exSection: { backgroundColor: '#fff', borderRadius: 10, padding: 12, opacity: 0.65 },
  exSectionActive: { opacity: 1, borderWidth: 2, borderColor: '#2563eb' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  infoBtn: { padding: 2 },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  replaceLabel: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
  exName: { fontSize: 15, fontWeight: '600', color: '#374151', flex: 1, textTransform: 'capitalize' },
  exNameActive: { color: '#111827' },
  setsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  setBubble: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  setBubbleDone: { backgroundColor: '#16a34a' },
  setBubbleActive: { backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#2563eb' },
  setBubbleText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  setBubbleTextDone: { color: '#fff' },
  setBubbleTextActive: { color: '#2563eb' },
  logBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  logTitle: { fontSize: 14, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  logRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  logField: { flex: 1, gap: 3 },
  logFieldLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' },
  logInput: { textAlign: 'center', fontSize: 18, fontWeight: '700' },
  logBtn: { paddingHorizontal: 18 },
  replacementSafe: { flex: 1, backgroundColor: '#f9fafb' },
  replacementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replacementTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  replacementList: { padding: 16, gap: 8 },
  replacementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  replacementRowSelected: { borderWidth: 2, borderColor: '#2563eb' },
  replacementBody: { flex: 1, gap: 3 },
  replacementName: { fontSize: 15, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  replacementMeta: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
});
