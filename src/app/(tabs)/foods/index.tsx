import { useEffect, useMemo, useState } from 'react';
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
import { fonts } from '../../../theme/fonts';
import { spacing } from '../../../theme/tokens';

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
  const searchFoodsAsync = useFoodStore((s) => s.searchFoodsAsync);
  const searchLoading = useFoodStore((s) => s.searchLoading);
  const searchError = useFoodStore((s) => s.searchError);
  const getCategories = useFoodStore((s) => s.getCategories);
  const customFoods = useFoodStore((s) => s.customFoods);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  // Déclenche la recherche réseau à chaque changement de requête
  useEffect(() => {
    searchFoodsAsync(query);
  }, [query, searchFoodsAsync]);

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
  }, [filteredFoods, t]);

  const hasResults = sections.length > 0;

  // État de chargement
  if (searchLoading) {
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
          <View style={styles.empty}>
            <EmptyState
              icon="hourglass-outline"
              title={t('foods.loading')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Indisponible ou non configuré
  if (searchError !== 'none' && query) {
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
          <View style={styles.empty}>
            <EmptyState
              icon="cloud-offline-outline"
              title={t('foods.unavailable')}
              subtitle={t('foods.unavailableHelp')}
              actionLabel={t('foods.retry')}
              onAction={() => searchFoodsAsync(query)}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
  searchBox: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: 6 },
  list: { paddingBottom: 16 },
  empty: { flexGrow: 1 },
  sectionHeader: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: c.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: c.bg,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
});
