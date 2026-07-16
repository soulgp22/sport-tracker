import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getExerciseAliases,
  getExerciseDisplayName,
  translateEquipment,
  translateMuscle,
} from '../../constants/exerciseI18n';
import {
  GYM_PROFILES,
  getGymFlag,
  getGymProfile,
  isExerciseAvailableAtGym,
  type GymProfileId,
} from '../../constants/gymProfiles';
import { useTranslation } from '../../i18n/useTranslation';
import { useExerciseCatalogStore } from '../../store/exerciseCatalogStore';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import type { CatalogExercise } from '../../types';
import { AnimatedExerciseImage } from './AnimatedExerciseImage';
import { TextInput } from '../ui/TextInput';
import { EmptyState } from '../ui/EmptyState';

interface ExerciseCatalogListProps {
  onSelect: (exercise: CatalogExercise) => void;
  selectedId?: string;
}

function ExerciseRow({
  exercise,
  selected,
  onPress,
}: {
  exercise: CatalogExercise;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const { language } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const displayName = getExerciseDisplayName(exercise, language);
  const aliases = getExerciseAliases(exercise.id, language);

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
          {translateMuscle(exercise.target, language)} ·{' '}
          {translateEquipment(exercise.equipment, language)}
        </Text>
        {aliases.length > 0 ? (
          <Text style={styles.alias} numberOfLines={1}>{aliases[0]}</Text>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : null}
    </TouchableOpacity>
  );
}

export function ExerciseCatalogList({ onSelect, selectedId }: ExerciseCatalogListProps) {
  const c = useColors();
  const { language, t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const searchCatalog = useExerciseCatalogStore((state) => state.search);
  const bodyParts = useExerciseCatalogStore((state) => state.bodyParts);
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [gymId, setGymId] = useState<GymProfileId>('all');
  const [gymMenuOpen, setGymMenuOpen] = useState(false);
  const gym = getGymProfile(gymId);

  const exercises = useMemo(() => {
    const searched = searchCatalog(query);
    return searched.filter(
      (exercise) =>
        (!bodyPart || exercise.bodyPart === bodyPart) &&
        isExerciseAvailableAtGym(exercise, gymId)
    );
  }, [bodyPart, gymId, query, searchCatalog]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('exercise.search')}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.gymFilter}>
        <Text style={styles.filterLabel}>{t('exercise.gym')}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ expanded: gymMenuOpen }}
          onPress={() => setGymMenuOpen((open) => !open)}
          activeOpacity={0.75}
          style={styles.gymTrigger}>
          <Text style={styles.gymValue}>
            {getGymFlag(gym.country)} {gym.id === 'all' ? t('exercise.allGyms') : gym.name}
          </Text>
          <View style={styles.gymTriggerRight}>
            <Text style={styles.resultCount}>{exercises.length}</Text>
            <Ionicons
              name={gymMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={c.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {gymMenuOpen ? (
          <View style={styles.gymMenu}>
            {GYM_PROFILES.map((profile) => {
              const active = profile.id === gymId;
              return (
                <TouchableOpacity
                  key={profile.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => {
                    setGymId(profile.id);
                    setGymMenuOpen(false);
                  }}
                  activeOpacity={0.72}
                  style={[styles.gymOption, active ? styles.gymOptionActive : null]}>
                  <Text style={[styles.gymOptionText, active ? styles.gymOptionTextActive : null]}>
                    {getGymFlag(profile.country)}{' '}
                    {profile.id === 'all' ? t('exercise.allGyms') : profile.name}
                  </Text>
                  {active ? <Ionicons name="checkmark-circle" size={19} color={c.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        <Text style={styles.gymHint}>{t('exercise.gymHint')}</Text>
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
  searchBox: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  gymFilter: { paddingHorizontal: 16, paddingBottom: 4, gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  gymTrigger: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  gymValue: { flex: 1, fontSize: 14, fontWeight: '700', color: c.textPrimary },
  gymTriggerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultCount: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: c.primary,
    backgroundColor: c.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  gymMenu: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },
  gymOption: {
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  gymOptionActive: { backgroundColor: c.accentSoft },
  gymOptionText: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  gymOptionTextActive: { color: c.primary },
  gymHint: { fontSize: 11, color: c.textMuted },
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
