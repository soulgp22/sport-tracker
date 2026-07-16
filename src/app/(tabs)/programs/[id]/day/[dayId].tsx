import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { GymBrandBadge } from '../../../../../components/gyms/GymBrandBadge';
import { isExerciseAvailableAtGym } from '../../../../../constants/gymProfiles';
import { useExerciseCatalogStore } from '../../../../../store/exerciseCatalogStore';
import {
  getExerciseDisplayName,
  translateEquipment,
  translateMuscle,
} from '../../../../../constants/exerciseI18n';
import { useColors } from '../../../../../theme/useColors';
import type { ThemeColors } from '../../../../../theme/palettes';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../../../constants/keyboard';
import { useTranslation } from '../../../../../i18n/useTranslation';
import { getRelatedExerciseIds } from '../../../../../lib/exerciseRelations';
import type { CatalogExercise, ProgramExercise, ProgramSet } from '../../../../../types';
import type { GymProfileId } from '../../../../../types/gym';

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
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
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
        <Ionicons name="close-circle" size={20} color={c.danger} />
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
  onLinkAlternative,
  onOpenDetail,
  gymId,
}: {
  exercise: ProgramExercise;
  onUpdate: (patch: Partial<ProgramExercise>) => void;
  onDelete: () => void;
  onSelectExercise: () => void;
  onAddAlternative: () => void;
  onLinkAlternative: (exerciseId: string) => void;
  onOpenDetail: () => void;
  gymId: GymProfileId;
}) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const getCatalogExercise = useExerciseCatalogStore((s) => s.getById);
  const catalogExercise = getCatalogExercise(exercise.exerciseId);
  const alternativeExerciseIds = useMemo(
    () => exercise.alternativeExerciseIds ?? [],
    [exercise.alternativeExerciseIds]
  );
  const suggestedExerciseIds = useMemo(
    () =>
      getRelatedExerciseIds(exercise.exerciseId, gymId, 4).filter(
        (exerciseId) => !alternativeExerciseIds.includes(exerciseId)
      ),
    [alternativeExerciseIds, exercise.exerciseId, gymId]
  );
  const isAvailable =
    !catalogExercise || gymId === 'all' || isExerciseAvailableAtGym(catalogExercise, gymId);
  const exerciseName = catalogExercise
    ? getExerciseDisplayName(catalogExercise)
    : exercise.exerciseName;

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
              {exerciseName ?? 'Choisir un exercice'}
            </Text>
            <Text style={styles.exercisePickerMeta} numberOfLines={1}>
              {catalogExercise
                ? `${translateMuscle(catalogExercise.target)} · ${translateEquipment(catalogExercise.equipment)}`
                : 'Appuyer pour choisir'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={c.danger} />
        </TouchableOpacity>
      </View>

      {catalogExercise ? (
        <TouchableOpacity style={styles.changeBtn} onPress={onSelectExercise} activeOpacity={0.7}>
          <Ionicons name="swap-horizontal" size={15} color={c.primary} />
          <Text style={styles.changeLabel}>Changer l&apos;exercice</Text>
        </TouchableOpacity>
      ) : null}

      {!isAvailable ? (
        <View style={styles.gymWarning}>
          <GymBrandBadge gymId={gymId} size={24} />
          <Ionicons name="alert-circle" size={16} color={c.danger} />
          <Text style={styles.gymWarningText}>{t('program.incompatibleGym')}</Text>
        </View>
      ) : null}

      <View style={styles.alternativesBlock}>
        <Text style={styles.alternativesTitle}>{t('program.manualAlternatives')}</Text>
        <View style={styles.alternativesRow}>
          {alternativeExerciseIds.map((alternativeId) => {
            const alternative = getCatalogExercise(alternativeId);
            return (
              <View key={alternativeId} style={styles.alternativeChip}>
                <Text style={styles.alternativeChipText} numberOfLines={1}>
                  {alternative ? getExerciseDisplayName(alternative) : 'Exercice inconnu'}
                </Text>
                <TouchableOpacity onPress={() => removeAlternative(alternativeId)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={c.primary} />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity style={styles.addAlternativeBtn} onPress={onAddAlternative}>
            <Ionicons name="add" size={15} color={c.primary} />
            <Text style={styles.addAlternativeLabel}>Ajouter une alternative</Text>
          </TouchableOpacity>
        </View>
      </View>

      {suggestedExerciseIds.length > 0 ? (
        <View style={styles.suggestionsBlock}>
          <Text style={styles.alternativesTitle}>{t('program.suggestions')}</Text>
          {suggestedExerciseIds.map((suggestedId) => {
            const suggestion = getCatalogExercise(suggestedId);
            if (!suggestion) return null;
            return (
              <View key={suggestedId} style={styles.suggestionRow}>
                <ExerciseThumbnail id={suggestedId} size={34} />
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {getExerciseDisplayName(suggestion)}
                </Text>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => onLinkAlternative(suggestedId)}>
                  <Ionicons name="link-outline" size={14} color={c.primary} />
                  <Text style={styles.linkButtonText}>{t('program.linkAlternative')}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ) : null}

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
        <Ionicons name="add" size={16} color={c.primary} />
        <Text style={styles.addSetLabel}>Ajouter une série</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DayEditScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
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
        exerciseName: getExerciseDisplayName(catalogExercise),
        ...(currentAlternatives.length > 0
          ? { alternativeExerciseIds: currentAlternatives.filter((alternativeId) => alternativeId !== catalogExercise.id) }
          : {}),
      });
    } else {
      addExerciseToDay(id, dayId, {
        exerciseId: catalogExercise.id,
        exerciseName: getExerciseDisplayName(catalogExercise),
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

  const linkAlternative = (programExerciseId: string, alternativeId: string) => {
    const targetExercise = day.exercises.find((exercise) => exercise.id === programExerciseId);
    if (!targetExercise) return;
    const currentAlternatives = targetExercise.alternativeExerciseIds ?? [];
    if (currentAlternatives.includes(alternativeId)) return;
    updateExerciseInDay(id, dayId, programExerciseId, {
      alternativeExerciseIds: [...currentAlternatives, alternativeId],
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={keyboardAvoidingBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
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
              <Ionicons name="pencil-outline" size={15} color={c.textSecondary} />
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
              onLinkAlternative={(alternativeId) => linkAlternative(item.id, alternativeId)}
              onOpenDetail={() => setDetailId(item.exerciseId)}
              gymId={program.gymProfileId ?? 'all'}
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
                <Ionicons name="close" size={24} color={c.textPrimary} />
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
              targetGymId={program.gymProfileId}
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  keyboardAvoiding: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayNameBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayNameInput: { flex: 1 },
  heading: { fontSize: 20, fontWeight: '700', color: c.textPrimary, flex: 1 },
  list: { paddingBottom: 16 },
  emptyContainer: { flex: 1 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  exerciseCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    gap: 8,
    shadowColor: c.overlay,
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
    borderColor: c.border,
    borderRadius: 10,
    padding: 8,
    backgroundColor: c.surfaceAlt,
  },
  exercisePickerBody: { flex: 1, gap: 2 },
  exercisePickerName: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  exercisePickerMeta: { fontSize: 12, color: c.textSecondary },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 2 },
  changeLabel: { color: c.primary, fontSize: 13, fontWeight: '600' },
  gymWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 8,
    borderRadius: 10,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.danger,
  },
  gymWarningText: { flex: 1, fontSize: 12, fontWeight: '700', color: c.danger },
  alternativesBlock: { gap: 6, paddingVertical: 2 },
  alternativesTitle: { fontSize: 11, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase' },
  alternativesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  alternativeChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: c.accentSoft,
  },
  alternativeChipText: { color: c.primary, fontSize: 12, fontWeight: '600' },
  addAlternativeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  addAlternativeLabel: { color: c.primary, fontSize: 12, fontWeight: '600' },
  suggestionsBlock: {
    gap: 5,
    padding: 8,
    borderRadius: 10,
    backgroundColor: c.surfaceAlt,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suggestionName: { flex: 1, fontSize: 12, fontWeight: '600', color: c.textPrimary },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: c.accentSoft,
  },
  linkButtonText: { fontSize: 11, fontWeight: '700', color: c.primary },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setIndex: { fontSize: 13, fontWeight: '600', color: c.textSecondary, width: 22 },
  setField: { flex: 1, gap: 2 },
  setFieldLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase' },
  setInput: { paddingVertical: 6, paddingHorizontal: 8, minHeight: 36, fontSize: 14 },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  addSetLabel: { color: c.primary, fontSize: 14, fontWeight: '500' },
  selectorSafe: { flex: 1, backgroundColor: c.bg },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectorTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: c.textPrimary, textAlign: 'center' },
});
