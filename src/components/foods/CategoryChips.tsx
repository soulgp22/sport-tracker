import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';

interface CategoryChipsProps {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
  includeAll?: boolean;
}

export function CategoryChips({
  categories,
  selectedCategory,
  onSelect,
  includeAll = true,
}: CategoryChipsProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const data = includeAll ? ['', ...categories] : categories;

  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(item) => item || 'all'}
      showsHorizontalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => {
        const selected = item === selectedCategory;

        return (
          <TouchableOpacity
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onSelect(item)}
            activeOpacity={0.75}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {item || 'Tous'}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  list: { flexGrow: 0, flexShrink: 0 },
  row: { paddingHorizontal: 16, gap: 8, paddingVertical: 8, alignItems: 'center' },
  chip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipSelected: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
  chipTextSelected: { color: c.primaryText },
});
