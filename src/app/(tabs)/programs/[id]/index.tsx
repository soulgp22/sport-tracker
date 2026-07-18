import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { GymBrandBadge } from '../../../../components/gyms/GymBrandBadge';
import { Button } from '../../../../components/ui/Button';
import { appAlert } from '../../../../components/ui/AppDialog';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { TextInput } from '../../../../components/ui/TextInput';
import { GYM_PROFILES, getGymProfile } from '../../../../constants/gymProfiles';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../../constants/keyboard';
import { getExerciseDisplayName } from '../../../../constants/exerciseI18n';
import { useTranslation } from '../../../../i18n/useTranslation';
import { analyzeProgramCompatibility } from '../../../../lib/exerciseRelations';
import { useExerciseCatalogStore } from '../../../../store/exerciseCatalogStore';
import { useProgramStore } from '../../../../store/programStore';
import { useColors } from '../../../../theme/useColors';
import type { ThemeColors } from '../../../../theme/palettes';
import type { ProgramDay } from '../../../../types';
import type { GymProfileId } from '../../../../types/gym';

function DayRow({
  day,
  issueCount,
  onEdit,
  onDelete,
}: {
  day: ProgramDay;
  issueCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <TouchableOpacity style={styles.dayRow} onPress={onEdit} activeOpacity={0.75}>
      <View style={styles.dayBody}>
        <Text style={styles.dayName}>{day.name}</Text>
        <Text style={styles.dayMeta}>
          {day.exercises.length} exercice{day.exercises.length !== 1 ? 's' : ''}
        </Text>
      </View>
      {issueCount > 0 ? (
        <View style={styles.issuePill}>
          <Ionicons name="swap-horizontal" size={13} color={c.danger} />
          <Text style={styles.issuePillText}>{issueCount}</Text>
        </View>
      ) : null}
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color={c.danger} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
    </TouchableOpacity>
  );
}

export default function ProgramDetailScreen() {
  const c = useColors();
  const { language, t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const getCatalogExercise = useExerciseCatalogStore((state) => state.getById);
  const program = useProgramStore((state) => state.programs.find((item) => item.id === id));
  const updateProgram = useProgramStore((state) => state.updateProgram);
  const duplicateProgramForGym = useProgramStore((state) => state.duplicateProgramForGym);
  const addDay = useProgramStore((state) => state.addDay);
  const deleteDay = useProgramStore((state) => state.deleteDay);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(program?.name ?? '');
  const [addingDay, setAddingDay] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const selectedGymId: GymProfileId = program?.gymProfileId ?? 'all';
  const compatibility = useMemo(
    () => (program ? analyzeProgramCompatibility(program, selectedGymId) : null),
    [program, selectedGymId]
  );

  if (!program || !compatibility) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="alert-circle-outline" title="Programme introuvable" />
      </SafeAreaView>
    );
  }

  const saveName = () => {
    if (nameValue.trim()) updateProgram(id, { name: nameValue.trim() });
    setEditingName(false);
  };

  const handleAddDay = () => {
    if (!newDayName.trim()) return;
    const day = addDay(id, newDayName.trim());
    setNewDayName('');
    setAddingDay(false);
    router.push(`/(tabs)/programs/${id}/day/${day.id}`);
  };

  const handleDeleteDay = (dayId: string, dayName: string) => {
    appAlert('Supprimer', `Supprimer le jour "${dayName}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteDay(id, dayId) },
    ]);
  };

  const handleConvert = () => {
    if (selectedGymId === 'all') return;
    const copy = duplicateProgramForGym(id, selectedGymId);
    if (!copy) return;
    appAlert(
      t('program.convertedTitle'),
      compatibility.unresolved > 0
        ? t('program.convertedPartial', { count: compatibility.unresolved })
        : t('program.convertedSuccess'),
      [{ text: 'OK', onPress: () => router.replace(`/(tabs)/programs/${copy.id}`) }]
    );
  };

  const selectedGym = getGymProfile(selectedGymId);
  const issuesByDay = new Map<string, number>();
  compatibility.issues.forEach((issue) => {
    issuesByDay.set(issue.dayId, (issuesByDay.get(issue.dayId) ?? 0) + 1);
  });

  const compatibilityHeader = (
    <View style={styles.headerContent}>
      <View style={styles.compatibilityCard}>
        <View style={styles.compatibilityTitleRow}>
          <View style={styles.compatibilityTitleCopy}>
            <Text style={styles.compatibilityTitle}>{t('program.gymCompatibility')}</Text>
            <Text style={styles.compatibilityHelp}>{t('program.gymCompatibilityHelp')}</Text>
          </View>
          <GymBrandBadge gymId={selectedGymId} size={46} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gymRow}>
          {GYM_PROFILES.map((profile) => {
            const selected = profile.id === selectedGymId;
            return (
              <TouchableOpacity
                key={profile.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => updateProgram(id, { gymProfileId: profile.id })}
                activeOpacity={0.75}
                style={[styles.gymChoice, selected ? styles.gymChoiceSelected : null]}>
                <GymBrandBadge gymId={profile.id} size={40} />
                <Text
                  style={[styles.gymChoiceText, selected ? styles.gymChoiceTextSelected : null]}
                  numberOfLines={1}>
                  {profile.shortName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedGymId === 'all' ? (
          <Text style={styles.noGymText}>{t('program.chooseGym')}</Text>
        ) : (
          <>
            <View style={styles.scoreRow}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{compatibility.percentage}%</Text>
              </View>
              <View style={styles.scoreCopy}>
                <Text style={styles.scoreTitle}>{selectedGym.name}</Text>
                <Text style={styles.scoreMeta}>
                  {t('program.compatibleCount', {
                    compatible: compatibility.compatible,
                    total: compatibility.total,
                  })}
                </Text>
                {compatibility.issues.length > 0 ? (
                  <Text style={styles.scoreWarning}>
                    {t('program.replacementCount', { count: compatibility.issues.length })}
                  </Text>
                ) : (
                  <Text style={styles.scoreSuccess}>{t('program.fullyCompatible')}</Text>
                )}
              </View>
            </View>

            {compatibility.issues.slice(0, 3).map((issue) => {
              const source = getCatalogExercise(issue.exerciseId);
              const replacement = issue.replacementId
                ? getCatalogExercise(issue.replacementId)
                : undefined;
              return (
                <View key={issue.programExerciseId} style={styles.replacementPreview}>
                  <Text style={styles.replacementFrom} numberOfLines={1}>
                    {source ? getExerciseDisplayName(source, language) : 'Exercice'}
                  </Text>
                  <Ionicons name="arrow-forward" size={15} color={c.textMuted} />
                  <Text style={styles.replacementTo} numberOfLines={1}>
                    {replacement
                      ? getExerciseDisplayName(replacement, language)
                      : t('program.noAlternative')}
                  </Text>
                </View>
              );
            })}

            {compatibility.issues.length > 0 ? (
              <Button
                title={t('program.createCompatibleCopy')}
                onPress={handleConvert}
                style={styles.convertButton}
              />
            ) : null}
          </>
        )}
      </View>

      <Text style={styles.sectionLabel}>Jours d&apos;entraînement</Text>
    </View>
  );

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
          {editingName ? (
            <TextInput
              value={nameValue}
              onChangeText={setNameValue}
              onBlur={saveName}
              onSubmitEditing={saveName}
              returnKeyType="done"
              autoFocus
              style={styles.nameInput}
            />
          ) : (
            <TouchableOpacity
              onPress={() => {
                setNameValue(program.name);
                setEditingName(true);
              }}
              style={styles.nameBtn}>
              <Text style={styles.heading} numberOfLines={1}>{program.name}</Text>
              <Ionicons name="pencil-outline" size={16} color={c.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={program.days}
          keyExtractor={(day) => day.id}
          renderItem={({ item }) => (
            <DayRow
              day={item}
              issueCount={issuesByDay.get(item.id) ?? 0}
              onEdit={() => router.push(`/(tabs)/programs/${id}/day/${item.id}`)}
              onDelete={() => handleDeleteDay(item.id, item.name)}
            />
          )}
          ListHeaderComponent={compatibilityHeader}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="Aucun jour"
              subtitle="Ajoutez un premier jour (ex : Push, Pull, Legs…)"
            />
          }
          contentContainerStyle={styles.list}
        />

        <View style={styles.footer}>
          {addingDay ? (
            <View style={styles.addDayForm}>
              <TextInput
                placeholder="Nom du jour (ex : Push)"
                value={newDayName}
                onChangeText={setNewDayName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddDay}
                style={styles.addDayInput}
              />
              <View style={styles.addDayBtns}>
                <Button
                  title="Annuler"
                  variant="secondary"
                  onPress={() => {
                    setAddingDay(false);
                    setNewDayName('');
                  }}
                  style={styles.halfBtn}
                />
                <Button title="Ajouter" onPress={handleAddDay} style={styles.halfBtn} />
              </View>
            </View>
          ) : (
            <Button
              title="+ Ajouter un jour"
              variant="secondary"
              onPress={() => setAddingDay(true)}
            />
          )}
        </View>
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
  nameBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameInput: { flex: 1 },
  heading: { fontSize: 20, fontWeight: '700', color: c.textPrimary, flex: 1 },
  list: { paddingBottom: 16 },
  headerContent: { gap: 8 },
  compatibilityCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 14,
    gap: 12,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  compatibilityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compatibilityTitleCopy: { flex: 1, gap: 3 },
  compatibilityTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary },
  compatibilityHelp: { fontSize: 12, lineHeight: 17, color: c.textSecondary },
  gymRow: { gap: 8, paddingRight: 4 },
  gymChoice: {
    width: 82,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  gymChoiceSelected: { borderWidth: 2, borderColor: c.primary, backgroundColor: c.accentSoft },
  gymChoiceText: { fontSize: 10, fontWeight: '700', color: c.textSecondary },
  gymChoiceTextSelected: { color: c.primary },
  noGymText: { fontSize: 12, color: c.textMuted, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
    borderWidth: 3,
    borderColor: c.primary,
  },
  scoreValue: { fontSize: 17, fontWeight: '900', color: c.primary },
  scoreCopy: { flex: 1, gap: 2 },
  scoreTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
  scoreMeta: { fontSize: 12, color: c.textSecondary },
  scoreWarning: { fontSize: 12, fontWeight: '700', color: c.danger },
  scoreSuccess: { fontSize: 12, fontWeight: '700', color: c.success },
  replacementPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.surfaceAlt,
  },
  replacementFrom: { flex: 1, fontSize: 12, color: c.textSecondary },
  replacementTo: { flex: 1, fontSize: 12, fontWeight: '700', color: c.primary },
  convertButton: { marginTop: 2 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dayBody: { flex: 1, gap: 2 },
  dayName: { fontSize: 16, fontWeight: '600', color: c.textPrimary },
  dayMeta: { fontSize: 13, color: c.textSecondary },
  issuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: c.accentSoft,
  },
  issuePillText: { fontSize: 11, fontWeight: '800', color: c.danger },
  deleteBtn: { paddingHorizontal: 8 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  addDayForm: { gap: 10 },
  addDayInput: {},
  addDayBtns: { flexDirection: 'row', gap: 8 },
  halfBtn: { flex: 1 },
});
