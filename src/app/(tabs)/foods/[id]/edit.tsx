import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodForm, type FoodFormValues } from '../../../../components/foods/FoodForm';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { colors } from '../../../../constants/colors';
import { useFoodStore } from '../../../../store/foodStore';

export default function EditFoodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const getFoodById = useFoodStore((s) => s.getFoodById);
  const getCategories = useFoodStore((s) => s.getCategories);
  const updateCustomFood = useFoodStore((s) => s.updateCustomFood);
  const customFoods = useFoodStore((s) => s.customFoods);

  const food = useMemo(() => getFoodById(id), [customFoods, getFoodById, id]);
  const categories = useMemo(() => getCategories(), [customFoods, getCategories]);

  const handleSubmit = (values: FoodFormValues) => {
    updateCustomFood(id, values);
    router.replace({
      pathname: '/(tabs)/foods/[id]' as never,
      params: { id },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading} numberOfLines={1}>
          Modifier l'aliment
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {!food ? (
        <EmptyState icon="alert-circle-outline" title="Aliment introuvable" />
      ) : !food.isCustom ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Aliment non modifiable"
          subtitle="Les aliments par défaut ne peuvent pas être modifiés."
        />
      ) : (
        <FoodForm
          initialFood={food}
          categories={categories}
          submitLabel="Enregistrer"
          onSubmit={handleSubmit}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
});
