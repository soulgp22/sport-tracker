import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getExerciseAliases,
  getExerciseDisplayName,
  translateEquipment,
  translateMuscle,
} from '../../constants/exerciseI18n';
import { isExerciseCompatibleWithProfile } from '../../constants/equipmentProfiles';
import { useTranslation } from '../../i18n/useTranslation';
import { useExerciseCatalogStore } from '../../store/exerciseCatalogStore';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import type { CatalogExercise } from '../../types';
import type { EquipmentProfileId } from '../../types/equipment';
import { AnimatedExerciseImage } from './AnimatedExerciseImage';
import { TextInput } from '../ui/TextInput';
import { EmptyState } from '../ui/EmptyState';

interface ExerciseCatalogListProps {
  onSelect: (exercise: CatalogExercise) => void;
  selectedId?: string;
  targetEquipmentProfileId?: EquipmentProfileId;
  onBrowseDownloads?: () => void;
}

function ExerciseRow({
  exercise,
  selected,
  onPress,
  targetEquipmentProfileId,
}: {
  exercise: CatalogExercise;
  selected: boolean;
  onPress: () => void;
  targetEquipmentProfileId?: EquipmentProfileId;
}) {
  const c = useColors();
  const { language } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const displayName = getExerciseDisplayName(exercise, language);
  const aliases = getExerciseAliases(exercise.id, language);
  const compatible =
    !targetEquipmentProfileId ||
    targetEquipmentProfileId === 'full-gym' ||
    isExerciseCompatibleWithProfile(exercise, targetEquipmentProfileId);

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.75}>
      <AnimatedExerciseImage
        id={exercise.id}
        style={styles.thumb}
        animate={false}
        accessibilityLabel={displayName}
      />
      <View style={styles.cardBody}>
        <Text style={styles.name} numberOfLines={2}>{displayName}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {translateMuscle(exercise.target, language)} · {' '}
          {translateEquipment(exercise.equipment, language)}
        </Text>
        {aliases.length > 0 ? (
          <Text style={styles.alias} numberOfLines={1}>{aliases[0]}</Text>
        ) : null}
      </View>
      {targetEquipmentProfileId && targetEquipmentProfileId !== 'full-gym' ? (
        <Ionicons
          name={compatible ? 'checkmark-circle' : 'alert-circle'}
          size={20}
          color={compatible ? c.success : c.danger}
        />
      ) : null}
      {selected ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : null}
    </TouchableOpacity>
  );
}

export function ExerciseCatalogList({
  onSelect,
  selectedId,
  targetEquipmentProfileId,
  onBrowseDownloads,
}: ExerciseCatalogListProps) {
  const c = useColors();
  const { language, t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const searchCatalog = useExerciseCatalogStore((state) => state.search);
  const bodyParts = useExerciseCatalogStore((state) => state.bodyParts);
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const installedPackIds = useExerciseCatalogStore((state) => state.installedPackIds);

  const exercises = useMemo(() => {
    const searched = searchCatalog(query);
    const filtered = bodyPart
      ? searched.filter((exercise) => exercise.bodyPart === bodyPart)
      : searched;
    if (!targetEquipmentProfileId || targetEquipmentProfileId === 'full-gym') return filtered;
    return [...filtered].sort(
      (a, b) =>
        Number(isExerciseCompatibleWithProfile(b, targetEquipmentProfileId)) -
        Number(isExerciseCompatibleWithProfile(a, targetEquipmentProfileId))
    );
  }, [bodyPart, query, searchCatalog, targetEquipmentProfileId]);

  return (
    <View style={styles.wrapper}>
      {onBrowseDownloads ? <TouchableOpacity style={styles.downloadBanner} onPress={onBrowseDownloads} activeOpacity={0.78}>
        <View style={styles.downloadIcon}><Ionicons name="cloud-download-outline" size={20} color={c.primary} /></View>
        <View style={styles.downloadCopy}><Text style={styles.downloadTitle}>{installedPackIds.length ? 'Catalogue téléchargé' : 'Plus d’exercices'}</Text><Text style={styles.downloadMeta}>{installedPackIds.length ? `${exercises.length} exercices disponibles · vérifier les mises à jour` : 'Télécharger gratuitement le catalogue GitHub'}</Text></View>
        <Ionicons name="chevron-forward" size={19} color={c.textMuted} />
      </TouchableOpacity> : null}
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('exercise.search')}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        horizontal
        data={['', ...bodyParts]}
        keyExtractor={(item) => item || 'all'}
        showsHorizontalScrollIndicator={false}
        style={styles.chipList}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }) => {
          const selected = item === bodyPart;
          return (
            <TouchableOpacity
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setBodyPart(item)}
              activeOpacity={0.75}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {item ? translateMuscle(item, language) : t('exercise.all')}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseRow
            exercise={item}
            selected={selectedId === item.id}
            onPress={() => onSelect(item)}
            targetEquipmentProfileId={targetEquipmentProfileId}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={t('exercise.none')}
            subtitle={t('exercise.noneHelp')}
          />
        }
        contentContainerStyle={exercises.length === 0 ? styles.empty : styles.list}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrapper: { flex: 1 },
  downloadBanner: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 15, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 10 },
  downloadIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft },
  downloadCopy: { flex: 1 },
  downloadTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
  downloadMeta: { fontSize: 11, lineHeight: 15, color: c.textSecondary, marginTop: 2 },
  searchBox: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  chipList: { flexGrow: 0, flexShrink: 0 },
  chipRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 8, alignItems: 'center' },
  chip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: c.surfaceAlt,
  },
  chipSelected: { backgroundColor: c.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
  chipTextSelected: { color: c.primaryText },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  empty: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSelected: { borderWidth: 2, borderColor: c.primary },
  thumb: { width: 58, height: 58, borderRadius: 8, backgroundColor: c.surfaceAlt },
  cardBody: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  meta: { fontSize: 12, color: c.textSecondary },
  alias: { fontSize: 11, color: c.primary, fontWeight: '600' },
});
