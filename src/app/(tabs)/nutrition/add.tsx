import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appAlert } from '../../../components/ui/AppDialog';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { TextInput } from '../../../components/ui/TextInput';
import { BarcodeScannerModal } from '../../../components/nutrition/BarcodeScannerModal';
import { canUseMealPhoto } from '../../../lib/mealPhotoCapability';
import { mealPhotoT as mt } from '../../../i18n/mealPhotoFallback';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { fonts } from '../../../theme/fonts';
import { makeShadows, radius, spacing } from '../../../theme/tokens';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../constants/keyboard';
import {
  calculateNutritionForQuantity,
  canLogByUnit,
  resolveQuantityInGrams,
} from '../../../lib/nutritionCalc';
import { fetchOffFood } from '../../../lib/openFoodFacts';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useFoodStore } from '../../../store/foodStore';
import { collectMealGroups, mealTypeLabel, MEAL_ORDER } from '../../../constants/meals';
import type { Food, MealType } from '../../../types';
import { useTranslation } from '../../../i18n/useTranslation';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

function parseQuantity(value: string) {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

function defaultQuantityForFood(food: Food) {
  return food.unit === 'g' || food.unit === 'ml' ? '100' : '1';
}

type MealPhotoReviewComponent = typeof import('../../../components/nutrition/MealPhotoReview').MealPhotoReview;

/**
 * Charge la modale photo uniquement quand la plateforme et la configuration
 * serveur sont compatibles. Le require synchrone côté Metro reste protégé pour
 * les environnements où le composant n'est pas disponible.
 */
function loadMealPhotoReview(): MealPhotoReviewComponent | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../../components/nutrition/MealPhotoReview') as typeof import('../../../components/nutrition/MealPhotoReview');
    return mod.MealPhotoReview;
  } catch {
    return null;
  }
}

function FoodResultRow({ food, onPress }: { food: Food; onPress: () => void }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <TouchableOpacity style={styles.foodRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.foodBody}>
        <Text style={styles.foodName} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={styles.foodMeta} numberOfLines={1}>
          {food.category} · {Math.round(food.nutritionPer100g.calories)} kcal/100g
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </TouchableOpacity>
  );
}

export default function AddMealScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const searchFoods = useFoodStore((s) => s.searchFoods);
  const searchFoodsAsync = useFoodStore((s) => s.searchFoodsAsync);
  const searchLoading = useFoodStore((s) => s.searchLoading);
  const searchError = useFoodStore((s) => s.searchError);
  const customFoods = useFoodStore((s) => s.customFoods);
  const getAllFoods = useFoodStore((s) => s.getAllFoods);
  const addCustomFood = useFoodStore((s) => s.addCustomFood);
  const addFoodEntry = useFoodDiaryStore((s) => s.addFoodEntry);

  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [quantityMode, setQuantityMode] = useState<'weight' | 'units'>('weight');
  const [mealType, setMealType] = useState<MealType>(() => getDefaultMealType());
  const [newGroupMode, setNewGroupMode] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  // `?scan=1` ouvre directement le lecteur de code-barres : l'ecran Nutrition
  // propose une entree « Scanner » distincte de l'analyse photo, qui menait
  // auparavant au meme endroit que la carte « Analyser un plat ».
  const params = useLocalSearchParams<{ scan?: string }>();
  const [scannerVisible, setScannerVisible] = useState(params.scan === '1');
  const [scanLoading, setScanLoading] = useState(false);
  const [mealPhotoReview, setMealPhotoReview] = useState<MealPhotoReviewComponent | null>(null);
  const [photoVisible, setPhotoVisible] = useState(false);

  // Gating photo : feature visible uniquement sur Android compatible quand la
  // configuration du serveur d'analyse est complète.
  useEffect(() => {
    let mounted = true;
    void canUseMealPhoto().then((capability) => {
      if (!mounted || !capability.ok) return;
      const component = loadMealPhotoReview();
      if (component) setMealPhotoReview(() => component);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Déclenche la recherche réseau à chaque changement de requête
  useEffect(() => {
    searchFoodsAsync(query);
  }, [query, searchFoodsAsync]);

  const results = useMemo(() => searchFoods(query), [customFoods, query, searchFoods]);
  const quantityNumber = parseQuantity(quantity);
  const loggableByUnit = selectedFood !== null && canLogByUnit(selectedFood);
  const byUnit = loggableByUnit && quantityMode === 'units';
  const quantityInGrams = selectedFood
    ? resolveQuantityInGrams(selectedFood, quantityNumber, byUnit)
    : 0;
  const calculatedNutrition = useMemo(() => {
    if (!selectedFood || quantityInGrams <= 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    return calculateNutritionForQuantity(selectedFood, quantityInGrams);
  }, [quantityInGrams, selectedFood]);

  const diaryEntries = useFoodDiaryStore((s) => s.entries);
  // Groupes proposés : ceux déjà utilisés (toutes dates) ; à défaut, les 4
  // classiques comme simples suggestions de départ. Aucun groupe imposé.
  const knownGroups = useMemo(() => collectMealGroups(diaryEntries), [diaryEntries]);
  const selectableGroups = knownGroups.length > 0 ? knownGroups : MEAL_ORDER;

  const canSubmit = selectedFood !== null && quantityInGrams > 0 && mealType.trim().length > 0;

  const handleSelectGroup = (value: MealType) => {
    setNewGroupMode(false);
    setNewGroupName('');
    setMealType(value);
  };

  const handleNewGroupChange = (value: string) => {
    setNewGroupName(value);
    setMealType(value.trim());
  };

  const handleSubmit = () => {
    if (!selectedFood || quantityInGrams <= 0) return;

    addFoodEntry({
      date: todayKey(),
      mealType,
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      quantity: quantityInGrams,
      unit: selectedFood.unit,
      calculatedNutrition,
    });

    router.back();
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setQuantity(defaultQuantityForFood(food));
    setQuantityMode('weight');
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setScannerVisible(false);

    // Déjà connu localement : pas besoin du réseau (offline-first).
    const existing = getAllFoods().find((food) => food.barcode === barcode);
    if (existing) {
      handleSelectFood(existing);
      return;
    }

    setScanLoading(true);
    try {
      const result = await fetchOffFood(barcode);

      if (result.kind === 'found') {
        addCustomFood(result.food);
        handleSelectFood(result.food);
        return;
      }

      if (result.kind === 'not-found') {
        appAlert(t('nutrition.scan.notFoundTitle'), t('nutrition.scan.notFoundMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('nutrition.scan.manualEntry'),
            onPress: () => router.push('/(tabs)/foods/new' as never),
          },
        ]);
        return;
      }

      if (result.kind === 'server-not-configured') {
        appAlert(
          t('nutrition.scan.serverNotConfiguredTitle'),
          t('nutrition.scan.serverNotConfiguredMessage')
        );
        return;
      }

      // unavailable : réseau KO, timeout ou passerelle injoignable.
      // Aucun produit inventé : message explicite, rien d'autre.
      appAlert(t('nutrition.scan.errorTitle'), t('nutrition.scan.errorMessage'));
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading}>{t('nutrition.addMeal')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={keyboardAvoidingBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}>
        {!selectedFood ? (
          <View style={styles.searchWrapper}>
            <View style={styles.searchBox}>
              <View style={styles.searchField}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('foods.searchPlaceholder')}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => setScannerVisible(true)}
                hitSlop={8}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={t('nutrition.scan.button')}>
                <Ionicons name="barcode-outline" size={22} color={c.textPrimary} />
              </TouchableOpacity>
              {mealPhotoReview ? (
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => setPhotoVisible(true)}
                  hitSlop={8}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={mt(t, 'mealPhoto.button')}>
                  <Ionicons name="camera-outline" size={22} color={c.textPrimary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {scanLoading ? (
              <View style={styles.scanLoading}>
                <ActivityIndicator color={c.primary} />
                <Text style={styles.scanLoadingText}>{t('nutrition.scan.loading')}</Text>
              </View>
            ) : null}

            {searchLoading ? (
              <View style={styles.emptyList}>
                <EmptyState
                  icon="hourglass-outline"
                  title={t('foods.loading')}
                />
              </View>
            ) : searchError !== 'none' && query.trim().length > 0 ? (
              <View style={styles.emptyList}>
                <EmptyState
                  icon="cloud-offline-outline"
                  title={t('foods.unavailable')}
                  subtitle={t('foods.unavailableHelp')}
                  actionLabel={t('foods.retry')}
                  onAction={() => searchFoodsAsync(query)}
                />
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FoodResultRow food={item} onPress={() => handleSelectFood(item)} />
                )}
                ListEmptyComponent={
                  query.trim().length > 0 ? (
                    <EmptyState
                      icon="search-outline"
                      title={t('nutrition.add.noResults')}
                      subtitle={t('nutrition.add.noResultsHelp')}
                      actionLabel={t('nutrition.add.scanBarcodeCTA')}
                      onAction={() => setScannerVisible(true)}
                      secondaryActionLabel={t('nutrition.add.manualEntryCTA')}
                      onSecondaryAction={() =>
                        router.push({
                          pathname: '/(tabs)/foods/new',
                          params: { name: query },
                        } as never)
                      }
                    />
                  ) : (
                    <EmptyState
                      icon="search-outline"
                      title={t('nutrition.add.noResults')}
                      subtitle={t('nutrition.add.noResultsHelp')}
                    />
                  )
                }
                contentContainerStyle={results.length > 0 ? styles.resultsList : styles.emptyList}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.selectedCard}>
              <Text style={styles.selectedLabel}>{t('nutrition.add.selectedFood')}</Text>
              <Text style={styles.selectedName}>{selectedFood.name}</Text>
              <Text style={styles.selectedMeta}>
                {selectedFood.category} · {Math.round(selectedFood.nutritionPer100g.calories)} kcal/100g
              </Text>
            </View>

            {loggableByUnit ? (
              <View style={styles.unitModeRow}>
                {(['weight', 'units'] as const).map((mode) => {
                  const selected = mode === quantityMode;

                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setQuantityMode(mode)}
                      activeOpacity={0.75}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {mode === 'weight'
                          ? t('nutrition.add.modeWeight', { unit: selectedFood.unit })
                          : t('nutrition.add.modeUnits')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <TextInput
              label={`${t('nutrition.add.quantity')} (${
                byUnit ? t('nutrition.add.modeUnits') : selectedFood.unit
              })`}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="100"
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('nutrition.add.mealSection')}</Text>
              <View style={styles.mealTypeRow}>
                {selectableGroups.map((value) => {
                  const selected = !newGroupMode && value === mealType;

                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => handleSelectGroup(value)}
                      activeOpacity={0.75}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {mealTypeLabel(value, t)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.chip, newGroupMode && styles.chipSelected]}
                  onPress={() => {
                    setNewGroupMode(true);
                    setNewGroupName('');
                    setMealType('');
                  }}
                  activeOpacity={0.75}>
                  <Text style={[styles.chipText, newGroupMode && styles.chipTextSelected]}>
                    + {t('nutrition.add.newGroup')}
                  </Text>
                </TouchableOpacity>
              </View>
              {newGroupMode ? (
                <TextInput
                  value={newGroupName}
                  onChangeText={handleNewGroupChange}
                  placeholder={t('nutrition.add.groupNamePlaceholder')}
                  autoFocus
                  maxLength={40}
                />
              ) : null}
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{t('nutrition.add.preview')}</Text>
              {byUnit && quantityNumber > 0 ? (
                <Text style={styles.previewApprox}>
                  {t('nutrition.add.unitsApprox', {
                    count: formatNumber(quantityNumber),
                    grams: formatNumber(quantityInGrams),
                  })}
                </Text>
              ) : null}
              <Text style={styles.previewCalories}>{calculatedNutrition.calories} kcal</Text>
              <Text style={styles.previewMacros}>
                P {formatNumber(calculatedNutrition.protein)} g · G{' '}
                {formatNumber(calculatedNutrition.carbs)} g · L{' '}
                {formatNumber(calculatedNutrition.fat)} g
              </Text>
            </View>

            <View style={styles.actions}>
              <Button title={t('nutrition.add.submit')} onPress={handleSubmit} disabled={!canSubmit} />
              <Button
                title={t('nutrition.add.changeFood')}
                variant="secondary"
                onPress={() => setSelectedFood(null)}
              />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {scannerVisible ? (
        <BarcodeScannerModal
          onClose={() => setScannerVisible(false)}
          onScanned={handleBarcodeScanned}
        />
      ) : null}

      {photoVisible && mealPhotoReview
        ? (() => {
            const PhotoReview = mealPhotoReview;
            return (
              <PhotoReview
                mealType={mealType}
                date={todayKey()}
                onClose={() => setPhotoVisible(false)}
                onAdded={() => {
                  setPhotoVisible(false);
                  router.back();
                }}
              />
            );
          })()
        : null}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => {
  const shadows = makeShadows(c);
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heading: { fontSize: 18, fontFamily: fonts.sansBold, color: c.textPrimary },
  headerSpacer: { width: 24 },
  keyboardAvoiding: { flex: 1 },
  searchWrapper: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 6,
  },
  searchField: { flex: 1 },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  scanLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  scanLoadingText: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textSecondary },
  resultsList: { paddingBottom: spacing.md },
  emptyList: { flexGrow: 1 },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: 5,
    gap: spacing.sm,
    ...shadows.card,
  },
  foodBody: { flex: 1, gap: spacing.xxs },
  foodName: { fontSize: 16, fontFamily: fonts.sansBold, color: c.textPrimary },
  foodMeta: { fontSize: 13, color: c.textSecondary },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  selectedCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: spacing.xxs,
    ...shadows.card,
  },
  selectedLabel: { fontSize: 12, fontFamily: fonts.sansBold, color: c.textSecondary },
  selectedName: { fontSize: 20, fontFamily: fonts.sansHeavy, color: c.textPrimary },
  selectedMeta: { fontSize: 13, color: c.primary, fontFamily: fonts.sansBold },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontFamily: fonts.sansBold, color: c.textPrimary },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  unitModeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textPrimary },
  chipTextSelected: { color: c.primaryText },
  previewCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.card,
  },
  previewTitle: { fontSize: 16, fontFamily: fonts.sansHeavy, color: c.textPrimary },
  previewApprox: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textSecondary },
  previewCalories: { fontSize: 28, fontFamily: fonts.sansHeavy, color: c.primary },
  previewMacros: { fontSize: 14, fontFamily: fonts.sansBold, color: c.textSecondary },
  actions: { gap: spacing.sm },
  });
};
