import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChips } from '../../../components/foods/CategoryChips';
import { FoodRow } from '../../../components/foods/FoodRow';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { TextInput } from '../../../components/ui/TextInput';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { useFoodStore } from '../../../store/foodStore';
import type { Food } from '../../../types';
import { useTranslation } from '../../../i18n/useTranslation';

interface FoodSection {
  title: string;
  data: Food[];
}

export default function FoodsScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const searchFoods = useFoodStore((s) => s.searchFoods);
  const getCategories = useFoodStore((s) => s.getCategories);
  const customFoods = useFoodStore((s) => s.customFoods);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(() => getCategories(), [customFoods, getCategories]);

  const filteredFoods = useMemo(() => {
    const searched = searchFoods(query);
    if (!category) return searched;

    return searched.filter((food) => food.category === category);
  }, [category, customFoods, query, searchFoods]);

  const sections = useMemo<FoodSection[]>(() => {
    const custom = filteredFoods.filter((food) => food.isCustom);
    const defaults = filteredFoods.filter((food) => !food.isCustom);
    const nextSections: FoodSection[] = [];

    if (custom.length > 0) {
      nextSections.push({ title: t('foods.myFoods', { count: custom.length }), data: custom });
    }

    if (defaults.length > 0) {
      nextSections.push({ title: t('foods.defaultFoods', { count: defaults.length }), data: defaults });
    }

    return nextSections;
  }, [filteredFoods]);

  const hasResults = sections.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.wrapper}>
        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('foods.searchPlaceholder')}
            autoCapitalize="none"
          />
        </View>

        <CategoryChips
          categories={categories}
          selectedCategory={category}
          onSelect={setCategory}
        />

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FoodRow
              food={item}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/foods/[id]' as never,
                  params: { id: item.id },
                })
              }
            />
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={t('foods.noFoods')}
              subtitle={t('foods.noFoodsHelp')}
            />
          }
          contentContainerStyle={hasResults ? styles.list : styles.empty}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.footer}>
          <Button
            title={t('foods.addFood')}
            variant="secondary"
            onPress={() => router.push('/(tabs)/foods/new' as never)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  wrapper: { flex: 1 },
  searchBox: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  list: { paddingBottom: 16 },
  empty: { flexGrow: 1 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: c.bg,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
});
