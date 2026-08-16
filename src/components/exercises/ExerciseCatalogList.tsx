import { useEffect, useMemo, useState } from 'react';
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
import { fonts } from '../../theme/fonts';

import type { ThemeColors } from '../../theme/palettes';
import { radius } from '../../theme/tokens';
import type { CatalogExercise } from '../../types';
import type { EquipmentProfileId } from '../../types/equipment';
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
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button">
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {translateMuscle(exercise.target, language)} · {' '}
          {translateEquipment(exercise.equipment, language)}
        </Text>
        {aliases.length > 0 ? (
          <Text style={styles.rowAlias} numberOfLines={1}>{aliases[0]}</Text>
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
  const searchAsync = useExerciseCatalogStore((state) => state.searchAsync);
  const searchResults = useExerciseCatalogStore((state) => state.searchResults);
  const searchLoading = useExerciseCatalogStore((state) => state.searchLoading);
  const searchError = useExerciseCatalogStore((state) => state.searchError);
  const bodyParts = useExerciseCatalogStore((state) => state.bodyParts);
  const allExercises = useExerciseCatalogStore((state) => state.exercises);
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const installedPackIds = useExerciseCatalogStore((state) => state.installedPackIds);

  // Déclenche la recherche réseau à chaque changement de requête
  useEffect(() => {
    searchAsync(query);
  }, [query, searchAsync]);

  const exercises = useMemo(() => {
    // Sans query : tout le catalogue local (navigable hors ligne),
    // avec query : résultats du serveur
    const source = query ? searchResults : allExercises;
    const filtered = bodyPart
      ? source.filter((exercise) => exercise.bodyPart === bodyPart)
      : source;
    if (!targetEquipmentProfileId || targetEquipmentProfileId === 'full-gym') return filtered;
    return [...filtered].sort(
      (a, b) =>
        Number(isExerciseCompatibleWithProfile(b, targetEquipmentProfileId)) -
        Number(isExerciseCompatibleWithProfile(a, targetEquipmentProfileId))
    );
  }, [bodyPart, query, searchResults, targetEquipmentProfileId, allExercises]);

  function renderHeader() {
    return (
      <View style={styles.header}>
        <Text style={styles.headerKicker}>{t('exercises.kicker')}</Text>
        <Text style={styles.headerTitle}>{t('exercises.title')}</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('exercise.search')}
          autoCapitalize="none"
          style={styles.searchInput}
        />
      </View>
    );
  }

  // État de chargement
  if (searchLoading) {
    return (
      <View style={styles.wrapper}>
        {renderHeader()}
        {renderDownloadBanner()}
        <View style={styles.empty}>
          <EmptyState
            icon="hourglass-outline"
            title={t('exercise.loading')}
          />
        </View>
      </View>
    );
  }

  // Indisponible ou non configuré
  if (searchError !== 'none' && query) {
    return (
      <View style={styles.wrapper}>
        {renderHeader()}
        {renderDownloadBanner()}
        {renderFilterRow()}
        <View style={styles.empty}>
          <EmptyState
            icon="cloud-offline-outline"
            title={t('exercise.unavailable')}
            subtitle={t('exercise.unavailableHelp')}
            actionLabel={t('exercise.retry')}
            onAction={() => searchAsync(query)}
          />
        </View>
      </View>
    );
  }

  function renderDownloadBanner() {
    if (!onBrowseDownloads) return null;
    return (
      <TouchableOpacity style={styles.downloadBanner} onPress={onBrowseDownloads} activeOpacity={0.78}>
        <View style={styles.downloadIcon}>
          <Ionicons name="cloud-download-outline" size={20} color={c.primary} />
        </View>
        <View style={styles.downloadCopy}>
          <Text style={styles.downloadTitle}>
            {installedPackIds.length ? t('exercise.catalogDownloaded') : t('exercise.moreExercises')}
          </Text>
          <Text style={styles.downloadMeta}>
            {installedPackIds.length
              ? t('exercise.catalogDownloadedMeta', { count: allExercises.length })
              : t('exercise.catalogDownloadMeta')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      </TouchableOpacity>
    );
  }

  function renderFilterRow() {
    return (
      <View style={styles.filterRow}>
        <View style={styles.filterInner}>
          <Text style={styles.filterLabel}>{t('exercises.filterMuscle')}</Text>
          <View style={styles.filterOptions}>
            {['', ...bodyParts].map((item) => {
              const selected = item === bodyPart;
              return (
                <TouchableOpacity
                  key={item || 'all'}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setBodyPart(item)}
                  activeOpacity={0.75}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {item ? translateMuscle(item, language) : t('exercise.all')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {renderHeader()}

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {renderDownloadBanner()}
            {renderFilterRow()}
          </>
        }
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

  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: c.border,
  },
  headerKicker: {
    fontFamily: fonts.serifBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
    color: c.secondary,
  },
  headerTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 34,
    lineHeight: 40,
    marginTop: 6,
    marginBottom: 14,
    color: c.textPrimary,
  },
  searchInput: { fontSize: 15, borderWidth: 1 },

  downloadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: c.border,
  },
  downloadIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accentSoft,
  },
  downloadCopy: { flex: 1 },
  downloadTitle: { fontSize: 14, fontFamily: fonts.sansHeavy, color: c.textPrimary },
  downloadMeta: { fontSize: 11, lineHeight: 15, color: c.textSecondary, marginTop: 2 },

  filterRow: {
    borderBottomWidth: 2,
    borderBottomColor: c.border,
    paddingVertical: 12,
  },
  filterInner: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  filterLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.textMuted,
    marginBottom: 6,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    borderColor: c.border,
  },
  chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontFamily: fonts.sans, fontSize: 12, color: c.textPrimary },
  chipTextSelected: { color: c.bg },

  list: { paddingBottom: 20 },
  empty: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rowCopy: { flex: 1 },
  rowTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 15,
    lineHeight: 19,
    color: c.textPrimary,
  },
  rowDetail: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    color: c.textSecondary,
  },
  rowAlias: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    color: c.primary,
  },
});
