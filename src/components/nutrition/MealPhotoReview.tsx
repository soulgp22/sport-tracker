import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
// Chargé uniquement via require() dynamique depuis add.tsx, après gating OK :
// ce fichier n'est jamais évalué sous Jest ni sur un appareil non compatible.
import { LFM2_5_VL_1_6B_QUANTIZED, useLLM } from 'react-native-executorch';

import { appAlert } from '../ui/AppDialog';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';
import { useTranslation } from '../../i18n/useTranslation';
import { mealPhotoT as mt } from '../../i18n/mealPhotoFallback';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';
import { buildPrompt, mapItemToFood, parseModelOutput } from '../../lib/mealPhotoAi';
import { calculateNutritionForQuantity } from '../../lib/nutritionCalc';
import { useFoodDiaryStore } from '../../store/foodDiaryStore';
import { useFoodStore } from '../../store/foodStore';
import type { Food, MealType } from '../../types';

const LICENSE_URL = 'https://docs.liquid.ai/lfm/help/model-license';
const GRAM_STEP = 25;
const MIN_STEP_GRAMS = 25;

interface ReviewItem {
  id: string;
  name: string;
  grams: number;
  food: Food | null;
  searching: boolean;
  searchQuery: string;
}

interface MealPhotoReviewProps {
  mealType: MealType;
  date: string;
  onClose: () => void;
  /** Appelé après enregistrement effectif des entrées. */
  onAdded: () => void;
}

let nextItemId = 1;

/**
 * Modale d'estimation d'un repas à partir d'une photo (VLM 100 % on-device).
 * L'IA ne calcule jamais les macros : elle propose des aliments + grammes,
 * la base locale calcule, l'utilisateur corrige et valide.
 */
export function MealPhotoReview({ mealType, date, onClose, onAdded }: MealPhotoReviewProps) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);

  const getAllFoods = useFoodStore((s) => s.getAllFoods);
  const searchFoods = useFoodStore((s) => s.searchFoods);
  const addFoodEntry = useFoodDiaryStore((s) => s.addFoodEntry);

  const llm = useLLM({ model: LFM2_5_VL_1_6B_QUANTIZED });

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const analysisStartedRef = useRef(false);

  // interrupt() obligatoire au démontage (doc executorch) : coupe l'inférence
  // en cours pour libérer la RAM native.
  const interruptRef = useRef(llm.interrupt);
  interruptRef.current = llm.interrupt;
  useEffect(() => {
    const interrupt = () => interruptRef.current();
    return interrupt;
  }, []);

  // Échec de chargement/téléchargement du modèle : alerte + retour.
  useEffect(() => {
    if (!llm.error) return;
    appAlert(mt(t, 'mealPhoto.errorTitle'), mt(t, 'mealPhoto.errorMessage'), [
      { text: 'OK', onPress: onClose },
    ]);
  }, [llm.error, onClose, t]);

  const analyze = async (uri: string) => {
    try {
      const output = await llm.sendMessage(buildPrompt(), { imagePath: uri });
      const recognized = parseModelOutput(output);

      if (recognized.length === 0) {
        appAlert(mt(t, 'mealPhoto.emptyTitle'), mt(t, 'mealPhoto.emptyMessage'), [
          { text: mt(t, 'mealPhoto.retry'), onPress: resetFlow },
          { text: mt(t, 'mealPhoto.manualEntry'), style: 'cancel', onPress: onClose },
        ]);
        return;
      }

      const foods = getAllFoods();
      setItems(
        recognized.map((item) => ({
          id: `item-${nextItemId++}`,
          name: item.name,
          grams: item.grams,
          food: mapItemToFood(item, foods),
          searching: false,
          searchQuery: '',
        }))
      );
    } catch {
      appAlert(mt(t, 'mealPhoto.errorTitle'), mt(t, 'mealPhoto.errorMessage'), [
        { text: 'OK', onPress: onClose },
      ]);
    }
  };

  // Analyse automatique dès que la photo est choisie ET le modèle prêt
  // (le téléchargement initial peut encore être en cours).
  useEffect(() => {
    if (!photoUri || !llm.isReady || analysisStartedRef.current) return;
    analysisStartedRef.current = true;
    void analyze(photoUri);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUri, llm.isReady]);

  function resetFlow() {
    interruptRef.current();
    analysisStartedRef.current = false;
    setPhotoUri(null);
    setItems(null);
  }

  const pickImage = async (source: 'camera' | 'gallery') => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        appAlert(mt(t, 'mealPhoto.title'), mt(t, 'mealPhoto.permissionCamera'));
        return;
      }
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    const uri = result.canceled ? null : result.assets[0]?.uri;
    if (uri) setPhotoUri(uri);
  };

  const updateItem = (id: string, patch: Partial<ReviewItem>) => {
    setItems((current) =>
      current ? current.map((item) => (item.id === id ? { ...item, ...patch } : item)) : current
    );
  };

  const removeItem = (id: string) => {
    setItems((current) => (current ? current.filter((item) => item.id !== id) : current));
  };

  const handleAddAll = () => {
    if (!items) return;

    for (const item of items) {
      if (!item.food || item.grams <= 0) continue;
      addFoodEntry({
        date,
        mealType,
        foodId: item.food.id,
        foodName: item.food.name,
        quantity: item.grams,
        unit: 'g',
        calculatedNutrition: calculateNutritionForQuantity(item.food, item.grams),
      });
    }

    onAdded();
  };

  const addableCount = items ? items.filter((item) => item.food !== null && item.grams > 0).length : 0;
  const downloadPercent = Math.round(llm.downloadProgress * 100);

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.heading}>{mt(t, 'mealPhoto.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!llm.isReady ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {llm.downloadProgress > 0 && llm.downloadProgress < 1
                  ? mt(t, 'mealPhoto.downloading', { percent: downloadPercent })
                  : mt(t, 'mealPhoto.modelLoading')}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${downloadPercent}%` }]} />
              </View>
              <Text style={styles.muted}>{mt(t, 'mealPhoto.downloadWarning')}</Text>
            </View>
          ) : null}

          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : null}

          {llm.isGenerating ? (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color={c.primary} />
              <Text style={styles.muted}>{mt(t, 'mealPhoto.analyzing')}</Text>
            </View>
          ) : null}

          {!items ? (
            <View style={styles.actions}>
              <Button
                title={mt(t, 'mealPhoto.takePhoto')}
                onPress={() => void pickImage('camera')}
                disabled={!llm.isReady || llm.isGenerating}
              />
              <Button
                title={mt(t, 'mealPhoto.pickFromGallery')}
                variant="secondary"
                onPress={() => void pickImage('gallery')}
                disabled={!llm.isReady || llm.isGenerating}
              />
            </View>
          ) : (
            <>
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={18} color={c.primary} />
                <Text style={styles.warningText}>{mt(t, 'mealPhoto.warningBanner')}</Text>
              </View>

              {items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      hitSlop={8}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={mt(t, 'mealPhoto.remove')}>
                      <Ionicons name="trash-outline" size={18} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {item.food ? (
                    <Text style={styles.itemMatch} numberOfLines={1}>
                      {item.food.name} · {Math.round(item.food.nutritionPer100g.calories)} kcal/100g
                    </Text>
                  ) : (
                    <View style={styles.itemSearchBlock}>
                      <TouchableOpacity
                        onPress={() =>
                          updateItem(item.id, { searching: !item.searching, searchQuery: '' })
                        }
                        activeOpacity={0.75}>
                        <Text style={styles.itemNotFound}>
                          {mt(t, 'mealPhoto.notFound')} — {mt(t, 'mealPhoto.searchManually')}
                        </Text>
                      </TouchableOpacity>
                      {item.searching ? (
                        <View style={styles.itemSearch}>
                          <TextInput
                            value={item.searchQuery}
                            onChangeText={(value) => updateItem(item.id, { searchQuery: value })}
                            placeholder={mt(t, 'mealPhoto.searchPlaceholder')}
                            autoCapitalize="none"
                          />
                          {item.searchQuery.trim()
                            ? searchFoods(item.searchQuery)
                                .slice(0, 4)
                                .map((food) => (
                                  <TouchableOpacity
                                    key={food.id}
                                    style={styles.searchResult}
                                    onPress={() =>
                                      updateItem(item.id, {
                                        food,
                                        searching: false,
                                        searchQuery: '',
                                      })
                                    }
                                    activeOpacity={0.75}>
                                    <Text style={styles.searchResultText} numberOfLines={1}>
                                      {food.name}
                                    </Text>
                                  </TouchableOpacity>
                                ))
                            : null}
                        </View>
                      ) : null}
                    </View>
                  )}

                  <View style={styles.gramsRow}>
                    <TouchableOpacity
                      style={[styles.stepButton, item.grams - GRAM_STEP < MIN_STEP_GRAMS && styles.stepButtonDisabled]}
                      onPress={() => updateItem(item.id, { grams: item.grams - GRAM_STEP })}
                      disabled={item.grams - GRAM_STEP < MIN_STEP_GRAMS}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel="-25 g">
                      <Ionicons name="remove" size={18} color={c.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.gramsValue}>{item.grams} g</Text>
                    <TouchableOpacity
                      style={styles.stepButton}
                      onPress={() => updateItem(item.id, { grams: item.grams + GRAM_STEP })}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel="+25 g">
                      <Ionicons name="add" size={18} color={c.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.actions}>
                <Button
                  title={mt(t, 'mealPhoto.addAll')}
                  onPress={handleAddAll}
                  disabled={addableCount === 0}
                />
                <Button title={mt(t, 'mealPhoto.retry')} variant="secondary" onPress={resetFlow} />
              </View>
            </>
          )}

          <TouchableOpacity
            onPress={() => void Linking.openURL(LICENSE_URL)}
            activeOpacity={0.7}
            accessibilityRole="link">
            <Text style={styles.license}>{mt(t, 'mealPhoto.license')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 14, fontFamily: fonts.sansBold, color: c.textPrimary },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: c.primary },
  muted: { fontSize: 13, fontFamily: fonts.sans, color: c.textSecondary },
  photo: { width: '100%', height: 200, borderRadius: 12, backgroundColor: c.surfaceAlt },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { gap: 12 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
  },
  warningText: { flex: 1, fontSize: 13, fontFamily: fonts.sansBold, color: c.textPrimary },
  itemCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  itemName: { flex: 1, fontSize: 16, fontFamily: fonts.sansBold, color: c.textPrimary },
  itemMatch: { fontSize: 13, fontFamily: fonts.sansBold, color: c.primary },
  itemSearchBlock: { gap: 8 },
  itemNotFound: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textSecondary },
  itemSearch: { gap: 6 },
  searchResult: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchResultText: { fontSize: 13, fontFamily: fonts.sans, color: c.textPrimary },
  gramsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  stepButtonDisabled: { opacity: 0.4 },
  gramsValue: {
    minWidth: 80,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: fonts.sansHeavy,
    color: c.textPrimary,
  },
  license: {
    fontSize: 12,
    fontFamily: fonts.sans,
    color: c.textMuted,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
