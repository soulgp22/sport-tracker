import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NutritionFacts } from '../../../components/foods/NutritionFacts';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { appAlert } from '../../../components/ui/AppDialog';
import { useColors } from '../../../theme/useColors';
import { useTranslation } from '../../../i18n/useTranslation';
import type { ThemeColors } from '../../../theme/palettes';
import { useFoodStore } from '../../../store/foodStore';

export default function FoodDetailScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const getFoodById = useFoodStore((s) => s.getFoodById);
  const deleteCustomFood = useFoodStore((s) => s.deleteCustomFood);
  const customFoods = useFoodStore((s) => s.customFoods);

  const food = useMemo(() => getFoodById(id), [customFoods, getFoodById, id]);

  const handleDelete = () => {
    if (!food?.isCustom) return;

    appAlert('Supprimer', `Supprimer "${food.name}" ?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
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
          {food?.name ?? t('foods.newFood')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {!food ? (
        <EmptyState icon="alert-circle-outline" title={t('foods.notFound')} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoCard}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{food.name}</Text>
              {food.isCustom ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{food.sourceUrl ? t('foods.badge.community') : t('foods.badge.custom')}</Text>
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
                title={t('common.edit')}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/foods/[id]/edit' as never,
                    params: { id: food.id },
                  })
                }
              />
              <Button title={t('common.delete')} variant="danger" onPress={handleDelete} />
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
