import { useMemo, useState } from 'react';
import {
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
import { appAlert } from '../../../../../components/ui/AppDialog';
import { TextInput } from '../../../../../components/ui/TextInput';
import { EmptyState } from '../../../../../components/ui/EmptyState';
import { ExerciseCatalogList } from '../../../../../components/exercises/ExerciseCatalogList';
import { ExerciseThumbnail } from '../../../../../components/exercises/ExerciseThumbnail';
import { ExerciseDetailView } from '../../../../../components/exercises/ExerciseDetailView';
import { EquipmentProfileBadge } from '../../../../../components/equipment/EquipmentProfileBadge';
import { isExerciseCompatibleWithProfile } from '../../../../../constants/equipmentProfiles';
import { useExerciseCatalogStore } from '../../../../../store/exerciseCatalogStore';
import {
  getExerciseDisplayName,
  translateEquipment,
  translateMuscle,
} from '../../../../../constants/exerciseI18n';
import { useColors } from '../../../../../theme/useColors';
import { fonts } from '../../../../../theme/fonts';
import { cardShadow, radius, spacing } from '../../../../../theme/tokens';

import type { ThemeColors } from '../../../../../theme/palettes';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../../../constants/keyboard';
import { useTranslation } from '../../../../../i18n/useTranslation';
import { getRelatedExerciseIds } from '../../../../../lib/exerciseRelations';
import type { CatalogExercise, ProgramExercise, ProgramSet } from '../../../../../types';
import type { EquipmentProfileId } from '../../../../../types/equipment';

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
  const { t } = useTranslation();
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
        <Text style={styles.setFieldLabel}>{t('progress.weightPlaceholder')}</Text>
        <TextInput
          value={String(set.weight)}
          onChangeText={(v) => onChange({ weight: parseFloat(v) || 0 })}
          keyboardType="decimal-pad"
          style={styles.setInput}
        />
      </View>
      <View style={styles.setField}>
        <Text style={styles.setFieldLabel}>{t('program.restLabel')}</Text>
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
  equipmentProfileId,
}: {
  exercise: ProgramExercise;
  onUpdate: (patch: Partial<ProgramExercise>) => void;
  onDelete: () => void;
  onSelectExercise: () => void;
  onAddAlternative: () => void;
  onLinkAlternative: (exerciseId: string) => void;
  onOpenDetail: () => void;
  equipmentProfileId: EquipmentProfileId;
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
      getRelatedExerciseIds(exercise.exerciseId, equipmentProfileId, 4).filter(
        (exerciseId) => !alternativeExerciseIds.includes(exerciseId)
      ),
    [alternativeExerciseIds, exercise.exerciseId, equipmentProfileId]
  );
  const isAvailable =
    !catalogExercise ||
    equipmentProfileId === 'full-gym' ||
    isExerciseCompatibleWithProfile(catalogExercise, equipmentProfileId);
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
              {exerciseName ?? t('progress.chooseExercise')}
            </Text>
            <Text style={styles.exercisePickerMeta} numberOfLines={1}>
              {catalogExercise
                ? `${translateMuscle(catalogExercise.target)} · ${translateEquipment(catalogExercise.equipment)}`
                : t('program.tapToChoose')}
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
          <Text style={styles.changeLabel}>{t('program.changeExercise')}</Text>
        </TouchableOpacity>
      ) : null}

      {!isAvailable ? (
        <View style={styles.equipmentWarning}>
          <EquipmentProfileBadge profileId={equipmentProfileId} size={24} />
          <Ionicons name="alert-circle" size={16} color={c.danger} />
          <Text style={styles.equipmentWarningText}>{t('program.incompatibleEquipment')}</Text>
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
                  {alternative ? getExerciseDisplayName(alternative) : t('program.unknownExercise')}
                </Text>
                <TouchableOpacity onPress={() => removeAlternative(alternativeId)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={c.primary} />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity style={styles.addAlternativeBtn} onPress={onAddAlternative}>
            <Ionicons name="add" size={15} color={c.primary} />
            <Text style={styles.addAlternativeLabel}>{t('program.addAlternative')}</Text>
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
        <Text style={styles.addSetLabel}>{t('program.addSet')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DayEditScreen() {
  const { t } = useTranslation();
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
        <EmptyState icon="alert-circle-outline" title={t('program.dayNotFound')} />
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
        appAlert(t('dialog.invalidAlternative'), t('dialog.invalidAlternativeMessage'));
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
    appAlert(t('foods.deleteTitle'), t('dialog.deleteExerciseMessage', { name: exName || t('program.thisExercise') }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteExerciseFromDay(id, dayId, exId) },
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
              equipmentProfileId={program.equipmentProfileId ?? 'full-gym'}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="fitness-outline"
              title={t('exercise.none')}
              subtitle={t('program.noExercisesHelp')}
            />
          }
          contentContainerStyle={day.exercises.length === 0 ? styles.emptyContainer : styles.list}
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.footer}>
          <Button title={t('program.addExercise')} variant="secondary" onPress={() => openSelector(null)} />
        </View>

        <Modal visible={selectorOpen} animationType="slide" onRequestClose={closeSelector}>
          <SafeAreaView style={styles.selectorSafe} edges={['top', 'bottom']}>
            <View style={styles.selectorHeader}>
              <TouchableOpacity onPress={closeSelector} hitSlop={8}>
                <Ionicons name="close" size={24} color={c.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.selectorTitle}>
                {alternativesTargetId ? t('program.addAlternative') : t('progress.chooseExercise')}
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
              targetEquipmentProfileId={program.equipmentProfileId}
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dayNameBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayNameInput: { flex: 1 },
  heading: { fontSize: 18, fontFamily: fonts.sansBold, color: c.textPrimary, flex: 1 },
  list: { paddingBottom: 16 },
  emptyContainer: { flex: 1 },
  footer: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  exerciseCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: spacing.md,
    gap: spacing.xs,
    ...cardShadow(c),
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exercisePicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: radius.sm,
    padding: spacing.xs,
    backgroundColor: c.surfaceAlt,
  },
  exercisePickerBody: { flex: 1, gap: 2 },
  exercisePickerName: { fontSize: 15, fontFamily: fonts.sansBold, color: c.textPrimary },
  exercisePickerMeta: { fontSize: 12, color: c.textSecondary },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 2 },
  changeLabel: { color: c.primary, fontSize: 13, fontFamily: fonts.sansSemi },
  equipmentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.danger,
  },
  equipmentWarningText: { flex: 1, fontSize: 12, fontFamily: fonts.sansBold, color: c.danger },
  alternativesBlock: { gap: spacing.xs, paddingVertical: 2 },
  alternativesTitle: { fontSize: 11, fontFamily: fonts.sansBold, color: c.textSecondary, textTransform: 'uppercase' },
  alternativesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  alternativeChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: c.accentSoft,
  },
  alternativeChipText: { color: c.primary, fontSize: 12, fontFamily: fonts.sansSemi },
  addAlternativeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  addAlternativeLabel: { color: c.primary, fontSize: 12, fontFamily: fonts.sansSemi },
  suggestionsBlock: {
    gap: 5,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: c.surfaceAlt,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suggestionName: { flex: 1, fontSize: 12, fontFamily: fonts.sansSemi, color: c.textPrimary },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.xs,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: c.accentSoft,
  },
  linkButtonText: { fontSize: 12, fontFamily: fonts.sansBold, color: c.primary },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setIndex: { fontSize: 13, fontFamily: fonts.sansSemi, color: c.textSecondary, width: 22 },
  setField: { flex: 1, gap: 2 },
  setFieldLabel: { fontSize: 10, color: c.textMuted, textTransform: 'uppercase' },
  setInput: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xs, minHeight: 36, fontSize: 14 },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  addSetLabel: { color: c.primary, fontSize: 14, fontFamily: fonts.sansSemi },
  selectorSafe: { flex: 1, backgroundColor: c.bg },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectorTitle: { flex: 1, fontSize: 18, fontFamily: fonts.sansBold, color: c.textPrimary, textAlign: 'center' },
});
