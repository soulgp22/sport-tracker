import { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useProgramStore } from '../../../../../store/programStore';
import { Button } from '../../../../../components/ui/Button';
import { TextInput } from '../../../../../components/ui/TextInput';
import { EmptyState } from '../../../../../components/ui/EmptyState';
import type { ProgramExercise, ProgramSet } from '../../../../../types';

const DEFAULT_SET: ProgramSet = { reps: 10, weight: 0, restSeconds: 90 };

function SetRow({
  set,
  index,
  onChange,
  onDelete,
}: {
  set: ProgramSet;
  index: number;
  onChange: (patch: Partial<ProgramSet>) => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.setRow}>
      <Text style={styles.setIndex}>S{index + 1}</Text>
      <View style={styles.setField}>
        <Text style={styles.setFieldLabel}>Reps</Text>
        <TextInput
          value={String(set.reps)}
          onChangeText={(v) => onChange({ reps: parseInt(v) || 0 })}
          keyboardType="numeric"
          style={styles.setInput}
        />
      </View>
      <View style={styles.setField}>
        <Text style={styles.setFieldLabel}>Poids (kg)</Text>
        <TextInput
          value={String(set.weight)}
          onChangeText={(v) => onChange({ weight: parseFloat(v) || 0 })}
          keyboardType="decimal-pad"
          style={styles.setInput}
        />
      </View>
      <View style={styles.setField}>
        <Text style={styles.setFieldLabel}>Repos (s)</Text>
        <TextInput
          value={String(set.restSeconds)}
          onChangeText={(v) => onChange({ restSeconds: parseInt(v) || 0 })}
          keyboardType="numeric"
          style={styles.setInput}
        />
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={8}>
        <Ionicons name="close-circle" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

function ExerciseCard({
  exercise,
  onUpdate,
  onDelete,
}: {
  exercise: ProgramExercise;
  onUpdate: (patch: Partial<ProgramExercise>) => void;
  onDelete: () => void;
}) {
  const updateSet = (setIndex: number, patch: Partial<ProgramSet>) => {
    const sets = exercise.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s));
    onUpdate({ sets });
  };

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1] ?? DEFAULT_SET;
    onUpdate({ sets: [...exercise.sets, { ...last }] });
  };

  const deleteSet = (setIndex: number) => {
    if (exercise.sets.length <= 1) return;
    onUpdate({ sets: exercise.sets.filter((_, i) => i !== setIndex) });
  };

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <TextInput
          value={exercise.exerciseName}
          onChangeText={(v) => onUpdate({ exerciseName: v })}
          placeholder="Nom de l'exercice"
          style={styles.exerciseNameInput}
        />
        <TouchableOpacity onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {exercise.sets.map((set, i) => (
        <SetRow
          key={i}
          set={set}
          index={i}
          onChange={(patch) => updateSet(i, patch)}
          onDelete={() => deleteSet(i)}
        />
      ))}

      <TouchableOpacity style={styles.addSetBtn} onPress={addSet}>
        <Ionicons name="add" size={16} color="#2563eb" />
        <Text style={styles.addSetLabel}>Ajouter une série</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DayEditScreen() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>();
  const router = useRouter();

  const program = useProgramStore((s) => s.programs.find((p) => p.id === id));
  const updateDay = useProgramStore((s) => s.updateDay);
  const addExerciseToDay = useProgramStore((s) => s.addExerciseToDay);
  const updateExerciseInDay = useProgramStore((s) => s.updateExerciseInDay);
  const deleteExerciseFromDay = useProgramStore((s) => s.deleteExerciseFromDay);

  const day = program?.days.find((d) => d.id === dayId);
  const [editingDayName, setEditingDayName] = useState(false);
  const [dayNameValue, setDayNameValue] = useState(day?.name ?? '');

  if (!program || !day) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="alert-circle-outline" title="Jour introuvable" />
      </SafeAreaView>
    );
  }

  const saveDayName = () => {
    if (dayNameValue.trim()) updateDay(id, dayId, { name: dayNameValue.trim() });
    setEditingDayName(false);
  };

  const handleAddExercise = () => {
    addExerciseToDay(id, dayId, {
      exerciseId: Math.random().toString(36).slice(2),
      exerciseName: '',
      sets: [{ ...DEFAULT_SET }],
    });
  };

  const handleDeleteExercise = (exId: string, exName: string) => {
    Alert.alert('Supprimer', `Supprimer "${exName || 'cet exercice'}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteExerciseFromDay(id, dayId, exId) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          {editingDayName ? (
            <TextInput
              value={dayNameValue}
              onChangeText={setDayNameValue}
              onBlur={saveDayName}
              onSubmitEditing={saveDayName}
              returnKeyType="done"
              autoFocus
              style={styles.dayNameInput}
            />
          ) : (
            <TouchableOpacity
              onPress={() => { setDayNameValue(day.name); setEditingDayName(true); }}
              style={styles.dayNameBtn}>
              <Text style={styles.heading} numberOfLines={1}>{day.name}</Text>
              <Ionicons name="pencil-outline" size={15} color="#6b7280" />
            </TouchableOpacity>
          )}
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={day.exercises}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <ExerciseCard
              exercise={item}
              onUpdate={(patch) => updateExerciseInDay(id, dayId, item.id, patch)}
              onDelete={() => handleDeleteExercise(item.id, item.exerciseName)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="fitness-outline"
              title="Aucun exercice"
              subtitle="Ajoutez votre premier exercice"
            />
          }
          contentContainerStyle={day.exercises.length === 0 ? styles.emptyContainer : styles.list}
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.footer}>
          <Button title="+ Ajouter un exercice" variant="secondary" onPress={handleAddExercise} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayNameBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayNameInput: { flex: 1 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', flex: 1 },
  list: { paddingBottom: 16 },
  emptyContainer: { flex: 1 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exerciseNameInput: { flex: 1 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setIndex: { fontSize: 13, fontWeight: '600', color: '#6b7280', width: 22 },
  setField: { flex: 1, gap: 2 },
  setFieldLabel: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase' },
  setInput: { paddingVertical: 6, paddingHorizontal: 8, minHeight: 36, fontSize: 14 },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  addSetLabel: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
});
