import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionFacts } from '../../../components/foods/NutritionFacts';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { colors } from '../../../constants/colors';
import { useFoodStore } from '../../../store/foodStore';

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const getFoodById = useFoodStore((s) => s.getFoodById);
  const deleteCustomFood = useFoodStore((s) => s.deleteCustomFood);
  const customFoods = useFoodStore((s) => s.customFoods);

  const food = useMemo(() => getFoodById(id), [customFoods, getFoodById, id]);

  const handleDelete = () => {
    if (!food?.isCustom) return;

    Alert.alert('Supprimer', `Supprimer "${food.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          deleteCustomFood(food.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading} numberOfLines={1}>
          {food?.name ?? 'Aliment'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {!food ? (
        <EmptyState icon="alert-circle-outline" title="Aliment introuvable" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{food.name}</Text>
              {food.isCustom ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Perso</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta}>
              {food.category} · {food.unit}
            </Text>
          </View>

          <NutritionFacts nutrition={food.nutritionPer100g} />

          {food.isCustom ? (
            <View style={styles.actions}>
              <Button
                title="Modifier"
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/foods/[id]/edit' as never,
                    params: { id: food.id },
                  })
                }
              />
              <Button title="Supprimer" variant="danger" onPress={handleDelete} />
            </View>
          ) : null}
        </ScrollView>
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
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    shadowColor: colors.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  meta: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  badge: {
    backgroundColor: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.textPrimary },
  actions: { gap: 10, paddingTop: 4 },
});
