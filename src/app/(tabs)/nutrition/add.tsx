import { useMemo, useState } from 'react';
import {
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

import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { TextInput } from '../../../components/ui/TextInput';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../constants/keyboard';
import { calculateNutritionForQuantity } from '../../../lib/nutritionCalc';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useFoodStore } from '../../../store/foodStore';
import type { Food, MealType } from '../../../types';

const mealTypes: { label: string; value: MealType }[] = [
  { label: 'Petit-déjeuner', value: 'breakfast' },
  { label: 'Déjeuner', value: 'lunch' },
  { label: 'Dîner', value: 'dinner' },
  { label: 'Collation', value: 'snack' },
];

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
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const searchFoods = useFoodStore((s) => s.searchFoods);
  const customFoods = useFoodStore((s) => s.customFoods);
  const addFoodEntry = useFoodDiaryStore((s) => s.addFoodEntry);

  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [mealType, setMealType] = useState<MealType>(() => getDefaultMealType());

  const results = useMemo(() => searchFoods(query), [customFoods, query, searchFoods]);
  const quantityNumber = parseQuantity(quantity);
  const calculatedNutrition = useMemo(() => {
    if (!selectedFood || quantityNumber <= 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    return calculateNutritionForQuantity(selectedFood, quantityNumber);
  }, [quantityNumber, selectedFood]);

  const canSubmit = selectedFood !== null && quantityNumber > 0;

  const handleSubmit = () => {
    if (!selectedFood || quantityNumber <= 0) return;

    addFoodEntry({
      date: todayKey(),
      mealType,
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      quantity: quantityNumber,
      unit: selectedFood.unit,
      calculatedNutrition,
    });

    router.back();
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setQuantity(defaultQuantityForFood(food));
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
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher un aliment"
                autoCapitalize="none"
              />
            </View>

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
              <Text style={styles.selectedLabel}>Aliment sélectionné</Text>
              <Text style={styles.selectedName}>{selectedFood.name}</Text>
              <Text style={styles.selectedMeta}>
                {selectedFood.category} · {Math.round(selectedFood.nutritionPer100g.calories)} kcal/100g
              </Text>
            </View>

            <TextInput
              label={`Quantité (${selectedFood.unit})`}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="100"
            />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Repas</Text>
              <View style={styles.mealTypeRow}>
                {mealTypes.map((item) => {
                  const selected = item.value === mealType;

                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setMealType(item.value)}
                      activeOpacity={0.75}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Aperçu</Text>
              <Text style={styles.previewCalories}>{calculatedNutrition.calories} kcal</Text>
              <Text style={styles.previewMacros}>
                P {formatNumber(calculatedNutrition.protein)} g · G{' '}
                {formatNumber(calculatedNutrition.carbs)} g · L{' '}
                {formatNumber(calculatedNutrition.fat)} g
              </Text>
            </View>

            <View style={styles.actions}>
              <Button title="Ajouter au journal" onPress={handleSubmit} disabled={!canSubmit} />
              <Button
                title="Changer d'aliment"
                variant="secondary"
                onPress={() => setSelectedFood(null)}
              />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
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
  heading: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  headerSpacer: { width: 24 },
  keyboardAvoiding: { flex: 1 },
  searchWrapper: { flex: 1 },
  searchBox: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  resultsList: { paddingBottom: 16 },
  emptyList: { flexGrow: 1 },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
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
  foodName: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  foodMeta: { fontSize: 13, color: c.textSecondary },
  content: { padding: 16, gap: 18, paddingBottom: 32 },
  selectedCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 4,
  },
  selectedLabel: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  selectedName: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
  selectedMeta: { fontSize: 13, color: c.primary, fontWeight: '700' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  chipText: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
  chipTextSelected: { color: c.primaryText },
  previewCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 8,
  },
  previewTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
  previewCalories: { fontSize: 28, fontWeight: '800', color: c.primary },
  previewMacros: { fontSize: 14, fontWeight: '700', color: c.textSecondary },
  actions: { gap: 12 },
});
