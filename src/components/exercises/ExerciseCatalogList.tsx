import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useExerciseCatalogStore } from '../../store/exerciseCatalogStore';
import {
  getExerciseDisplayName,
  translateEquipment,
  translateMuscle,
} from '../../constants/exerciseI18n';
import { AnimatedExerciseImage } from './AnimatedExerciseImage';
import { TextInput } from '../ui/TextInput';
import { EmptyState } from '../ui/EmptyState';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import type { CatalogExercise } from '../../types';

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
  const styles = useMemo(() => makeStyles(c), [c]);
  const displayName = getExerciseDisplayName(exercise);

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
          {translateMuscle(exercise.target)} · {translateEquipment(exercise.equipment)}
        </Text>
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : null}
    </TouchableOpacity>
  );
}

export function ExerciseCatalogList({ onSelect, selectedId }: ExerciseCatalogListProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const searchCatalog = useExerciseCatalogStore((s) => s.search);
  const bodyParts = useExerciseCatalogStore((s) => s.bodyParts);
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState('');

  const exercises = useMemo(() => {
    const searched = searchCatalog(query);
    if (!bodyPart) return searched;
    return searched.filter((exercise) => exercise.bodyPart === bodyPart);
  }, [bodyPart, query, searchCatalog]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un exercice"
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
                {item ? translateMuscle(item) : 'Tous'}
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
            title="Aucun exercice"
            subtitle="Essayez une autre recherche ou un autre filtre"
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
});
