import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors } from '../../constants/colors';

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

const styles = StyleSheet.create({
  list: { flexGrow: 0, flexShrink: 0 },
  row: { paddingHorizontal: 16, gap: 8, paddingVertical: 8, alignItems: 'center' },
  chip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  chipTextSelected: { color: colors.primaryText },
});
