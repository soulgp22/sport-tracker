import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodForm, type FoodFormValues } from '../../../components/foods/FoodForm';
import { colors } from '../../../constants/colors';
import { normalizeFoodName, useFoodStore } from '../../../store/foodStore';
import type { Food } from '../../../types';

function buildUniqueFoodId(name: string, foods: Food[]) {
  const base = normalizeFoodName(name).replace(/\s+/g, '_') || 'aliment';
  const existingIds = new Set(foods.map((food) => food.id));
  let candidate = base;
  let suffix = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export default function NewFoodScreen() {
  const router = useRouter();
  const addCustomFood = useFoodStore((s) => s.addCustomFood);
  const getAllFoods = useFoodStore((s) => s.getAllFoods);
  const getCategories = useFoodStore((s) => s.getCategories);
  const customFoods = useFoodStore((s) => s.customFoods);

  const allFoods = useMemo(() => getAllFoods(), [customFoods, getAllFoods]);
  const categories = useMemo(() => getCategories(), [customFoods, getCategories]);

  const handleSubmit = (values: FoodFormValues) => {
    const food: Food = {
      id: buildUniqueFoodId(values.name, allFoods),
      ...values,
      isCustom: true,
    };

    addCustomFood(food);
    router.replace({
      pathname: '/(tabs)/foods/[id]' as never,
      params: { id: food.id },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading}>Nouvel aliment</Text>
        <View style={{ width: 24 }} />
      </View>

      <FoodForm categories={categories} submitLabel="Créer l'aliment" onSubmit={handleSubmit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
});
