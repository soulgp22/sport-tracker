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
import { useRouter } from 'expo-router';
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
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../constants/keyboard';
import {
  calculateNutritionForQuantity,
  canLogByUnit,
  resolveQuantityInGrams,
} from '../../../lib/nutritionCalc';
import { fetchOffFood } from '../../../lib/openFoodFacts';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useFoodStore } from '../../../store/foodStore';
import type { Food, MealType } from '../../../types';
import { useTranslation } from '../../../i18n/useTranslation';

const MEAL_TYPE_KEYS: Record<MealType, string> = {
  breakfast: 'nutrition.add.meal.breakfast',
  lunch: 'nutrition.add.meal.lunch',
  dinner: 'nutrition.add.meal.dinner',
  snack: 'nutrition.add.meal.snack',
};

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
 * Charge la modale photo (et donc react-native-executorch) uniquement quand
 * le gating est OK. Le require est synchrone côté Metro et reste inerte sous
 * Jest / Expo Go (module natif absent → catch → null).
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
  const customFoods = useFoodStore((s) => s.customFoods);
  const getAllFoods = useFoodStore((s) => s.getAllFoods);
  const addCustomFood = useFoodStore((s) => s.addCustomFood);
  const addFoodEntry = useFoodDiaryStore((s) => s.addFoodEntry);

  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [quantityMode, setQuantityMode] = useState<'weight' | 'units'>('weight');
  const [mealType, setMealType] = useState<MealType>(() => getDefaultMealType());
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [mealPhotoReview, setMealPhotoReview] = useState<MealPhotoReviewComponent | null>(null);
  const [photoVisible, setPhotoVisible] = useState(false);

  // Gating photo : feature visible uniquement sur appareils compatibles
  // (Android 13+, RAM, stockage). Le module executorch n'est chargé qu'ici,
  // après gating OK.
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

  const canSubmit = selectedFood !== null && quantityInGrams > 0;

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
        <Text style={styles.heading}>Ajouter un repas</Text>
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

            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <FoodResultRow food={item} onPress={() => handleSelectFood(item)} />
              )}
              ListEmptyComponent={
                <EmptyState
                  icon="search-outline"
                  title="Aucun aliment"
                  subtitle="Essayez une autre recherche"
                />
              }
              contentContainerStyle={results.length > 0 ? styles.resultsList : styles.emptyList}
              keyboardShouldPersistTaps="handled"
            />
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
              <Text style={styles.sectionTitle}>Repas</Text>
              <View style={styles.mealTypeRow}>
                {Object.entries(MEAL_TYPE_KEYS).map(([value, key]) => {
                  const selected = value === mealType;

                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setMealType(value as MealType)}
                      activeOpacity={0.75}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {t(key)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { fontSize: 18, fontFamily: fonts.sansBold, color: c.textPrimary },
  headerSpacer: { width: 24 },
  keyboardAvoiding: { flex: 1 },
  searchWrapper: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchField: { flex: 1 },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  scanLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scanLoadingText: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textSecondary },
  resultsList: { paddingBottom: 16 },
  emptyList: { flexGrow: 1 },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    gap: 10,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  foodBody: { flex: 1, gap: 3 },
  foodName: { fontSize: 16, fontFamily: fonts.sansBold, color: c.textPrimary },
  foodMeta: { fontSize: 13, color: c.textSecondary },
  content: { padding: 16, gap: 18, paddingBottom: 32 },
  selectedCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedLabel: { fontSize: 12, fontFamily: fonts.sansBold, color: c.textSecondary },
  selectedName: { fontSize: 20, fontFamily: fonts.sansHeavy, color: c.textPrimary },
  selectedMeta: { fontSize: 13, color: c.primary, fontFamily: fonts.sansBold },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.sansBold, color: c.textPrimary },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitModeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textPrimary },
  chipTextSelected: { color: c.primaryText },
  previewCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  previewTitle: { fontSize: 16, fontFamily: fonts.sansHeavy, color: c.textPrimary },
  previewApprox: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textSecondary },
  previewCalories: { fontSize: 28, fontFamily: fonts.sansHeavy, color: c.primary },
  previewMacros: { fontSize: 14, fontFamily: fonts.sansBold, color: c.textSecondary },
  actions: { gap: 12 },
});
