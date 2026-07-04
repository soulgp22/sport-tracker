import { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { ExerciseCatalogList } from '../../../../../components/exercises/ExerciseCatalogList';
import { ExerciseThumbnail } from '../../../../../components/exercises/ExerciseThumbnail';
import { ExerciseDetailView } from '../../../../../components/exercises/ExerciseDetailView';
import { useExerciseCatalogStore } from '../../../../../store/exerciseCatalogStore';
import type { CatalogExercise, ProgramExercise, ProgramSet } from '../../../../../types';

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
  onSelectExercise,
  onAddAlternative,
  onOpenDetail,
}: {
  exercise: ProgramExercise;
  onUpdate: (patch: Partial<ProgramExercise>) => void;
  onDelete: () => void;
  onSelectExercise: () => void;
  onAddAlternative: () => void;
  onOpenDetail: () => void;
}) {
  const getCatalogExercise = useExerciseCatalogStore((s) => s.getById);
  const catalogExercise = getCatalogExercise(exercise.exerciseId);
  const alternativeExerciseIds = exercise.alternativeExerciseIds ?? [];

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

  const removeAlternative = (alternativeId: string) => {
    onUpdate({
      alternativeExerciseIds: alternativeExerciseIds.filter((id) => id !== alternativeId),
    });
  };

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <TouchableOpacity
          style={styles.exercisePicker}
          onPress={catalogExercise ? onOpenDetail : onSelectExercise}
          activeOpacity={0.75}>
          {catalogExercise ? <ExerciseThumbnail id={catalogExercise.id} size={44} /> : null}
          <View style={styles.exercisePickerBody}>
            <Text style={styles.exercisePickerName} numberOfLines={1}>
              {catalogExercise?.name ?? exercise.exerciseName ?? 'Choisir un exercice'}
            </Text>
            <Text style={styles.exercisePickerMeta} numberOfLines={1}>
              {catalogExercise
                ? `${catalogExercise.target} · ${catalogExercise.equipment}`
                : 'Appuyer pour choisir'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {catalogExercise ? (
        <TouchableOpacity style={styles.changeBtn} onPress={onSelectExercise} activeOpacity={0.7}>
          <Ionicons name="swap-horizontal" size={15} color="#2563eb" />
          <Text style={styles.changeLabel}>Changer l&apos;exercice</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.alternativesBlock}>
        <Text style={styles.alternativesTitle}>Alternatives</Text>
        <View style={styles.alternativesRow}>
          {alternativeExerciseIds.map((alternativeId) => {
            const alternative = getCatalogExercise(alternativeId);
            return (
              <View key={alternativeId} style={styles.alternativeChip}>
                <Text style={styles.alternativeChipText} numberOfLines={1}>
                  {alternative?.name ?? 'Exercice inconnu'}
                </Text>
                <TouchableOpacity onPress={() => removeAlternative(alternativeId)} hitSlop={8}>
                  <Ionicons name="close" size={14} color="#2563eb" />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity style={styles.addAlternativeBtn} onPress={onAddAlternative}>
            <Ionicons name="add" size={15} color="#2563eb" />
            <Text style={styles.addAlternativeLabel}>Ajouter une alternative</Text>
          </TouchableOpacity>
        </View>
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
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [alternativesTargetId, setAlternativesTargetId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

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

  const openSelector = (programExerciseId: string | null) => {
    setEditingExerciseId(programExerciseId);
    setAlternativesTargetId(null);
    setSelectorOpen(true);
  };

  const openAlternativeSelector = (programExerciseId: string) => {
    setEditingExerciseId(null);
    setAlternativesTargetId(programExerciseId);
    setSelectorOpen(true);
  };

  const closeSelector = () => {
    setSelectorOpen(false);
    setEditingExerciseId(null);
    setAlternativesTargetId(null);
  };

  const handleSelectCatalogExercise = (catalogExercise: CatalogExercise) => {
    if (alternativesTargetId) {
      const targetExercise = day.exercises.find((exercise) => exercise.id === alternativesTargetId);
      if (!targetExercise) {
        closeSelector();
        return;
      }

      if (catalogExercise.id === targetExercise.exerciseId) {
        Alert.alert('Alternative invalide', 'Choisis un exercice différent de l\'exercice principal.');
        return;
      }

      const currentAlternatives = targetExercise.alternativeExerciseIds ?? [];
      if (!currentAlternatives.includes(catalogExercise.id)) {
        updateExerciseInDay(id, dayId, alternativesTargetId, {
          alternativeExerciseIds: [...currentAlternatives, catalogExercise.id],
        });
      }
    } else if (editingExerciseId) {
      const targetExercise = day.exercises.find((exercise) => exercise.id === editingExerciseId);
      const currentAlternatives = targetExercise?.alternativeExerciseIds ?? [];
      updateExerciseInDay(id, dayId, editingExerciseId, {
        exerciseId: catalogExercise.id,
        exerciseName: catalogExercise.name,
        ...(currentAlternatives.length > 0
          ? { alternativeExerciseIds: currentAlternatives.filter((alternativeId) => alternativeId !== catalogExercise.id) }
          : {}),
      });
    } else {
      addExerciseToDay(id, dayId, {
        exerciseId: catalogExercise.id,
        exerciseName: catalogExercise.name,
        sets: [{ ...DEFAULT_SET }],
      });
    }
    closeSelector();
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
              onSelectExercise={() => openSelector(item.id)}
              onAddAlternative={() => openAlternativeSelector(item.id)}
              onOpenDetail={() => setDetailId(item.exerciseId)}
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
          <Button title="+ Ajouter un exercice" variant="secondary" onPress={() => openSelector(null)} />
        </View>

        <Modal visible={selectorOpen} animationType="slide" onRequestClose={closeSelector}>
          <SafeAreaView style={styles.selectorSafe} edges={['top', 'bottom']}>
            <View style={styles.selectorHeader}>
              <TouchableOpacity onPress={closeSelector} hitSlop={8}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.selectorTitle}>
                {alternativesTargetId ? 'Ajouter une alternative' : 'Choisir un exercice'}
              </Text>
              <View style={{ width: 24 }} />
            </View>
            <ExerciseCatalogList
              selectedId={
                alternativesTargetId
                  ? day.exercises.find((exercise) => exercise.id === alternativesTargetId)?.exerciseId
                  : editingExerciseId
                  ? day.exercises.find((exercise) => exercise.id === editingExerciseId)?.exerciseId
                  : undefined
              }
              onSelect={handleSelectCatalogExercise}
            />
          </SafeAreaView>
        </Modal>

        <Modal visible={!!detailId} animationType="slide" onRequestClose={() => setDetailId(null)}>
          {detailId ? <ExerciseDetailView id={detailId} onClose={() => setDetailId(null)} /> : null}
        </Modal>
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
  exercisePicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#fff',
  },
  exercisePickerBody: { flex: 1, gap: 2 },
  exercisePickerName: { fontSize: 15, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  exercisePickerMeta: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 2 },
  changeLabel: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  alternativesBlock: { gap: 6, paddingVertical: 2 },
  alternativesTitle: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' },
  alternativesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  alternativeChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
  },
  alternativeChipText: { color: '#1d4ed8', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  addAlternativeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  addAlternativeLabel: { color: '#2563eb', fontSize: 12, fontWeight: '600' },
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
  selectorSafe: { flex: 1, backgroundColor: '#f9fafb' },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectorTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
});
