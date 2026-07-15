import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionFacts } from '../../../components/foods/NutritionFacts';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { useFoodStore } from '../../../store/foodStore';

export default function FoodDetailScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
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
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { flex: 1, fontSize: 18, fontWeight: '700', color: c.textPrimary },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  infoCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: c.textPrimary },
  meta: { fontSize: 14, color: c.primary, fontWeight: '600' },
  badge: {
    backgroundColor: c.secondary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: c.textPrimary },
  actions: { gap: 10, paddingTop: 4 },
});
