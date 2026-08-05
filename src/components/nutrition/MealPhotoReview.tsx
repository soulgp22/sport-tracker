import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
// Chargé uniquement via require() dynamique depuis add.tsx/photo.tsx : ce
// fichier n'est jamais évalué sous Jest. Le modèle ne tourne plus sur
// l'appareil : l'app envoie la photo au serveur (llama-server, v9 GGUF).

import { appAlert } from '../ui/AppDialog';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';
import { useTranslation } from '../../i18n/useTranslation';
import { mealPhotoT as mt } from '../../i18n/mealPhotoFallback';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';
import { buildPrompt, mapItemToFood, parseModelOutput } from '../../lib/mealPhotoAi';
import {
  MEAL_SERVER_TIMEOUTS,
  buildAnalysisRequest,
  buildFoodInfoRequest,
  buildHealthRequest,
  extractCompletionText,
} from '../../lib/mealPhotoApi';
import { createMealPhotoExitFlow, safeInterrupt } from '../../lib/mealPhotoExit';
import { logMealPhotoTraining, type ModelItem } from '../../lib/mealPhotoTrainingLog';
import { calculateNutritionForQuantity } from '../../lib/nutritionCalc';
import { useFoodDiaryStore } from '../../store/foodDiaryStore';
import { useFoodStore } from '../../store/foodStore';
import { useLanguageStore } from '../../store/languageStore';
import type { Food, MealType } from '../../types';

const GRAM_STEP = 25;
const MIN_STEP_GRAMS = 25;

interface ReviewItem {
  id: string;
  name: string;
  grams: number;
  food: Food | null;
  /** Match automatique au moment de l'analyse (référence du diff d'entraînement). */
  initialFoodName: string | null;
  searching: boolean;
  searchQuery: string;
  /** Enrichissement IA d'un aliment absent de la base : en cours / échoué. */
  enrichStatus?: 'pending' | 'failed';
}

interface MealPhotoReviewProps {
  mealType: MealType;
  date: string;
  onClose: () => void;
  /** Appelé après enregistrement effectif des entrées. */
  onAdded: () => void;
}

let nextItemId = 1;

/** Formatage macro façon MacroBar : entier tel quel, sinon 1 décimale à virgule. */
function formatMacro(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

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
  const addCustomFood = useFoodStore((s) => s.addCustomFood);
  const addFoodEntry = useFoodDiaryStore((s) => s.addFoodEntry);
  const language = useLanguageStore((s) => s.language);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const analysisStartedRef = useRef(false);

  // --- Moteur VLM : serveur llama-server (v9 GGUF) --------------------------
  // Le modèle ne quitte jamais le serveur : l'app envoie la photo (JPEG
  // base64) et reçoit le JSON. isReady = sonde /health OK, isGenerating =
  // requête en cours, abortRef = interrupt.
  const abortRef = useRef<AbortController | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [engineError, setEngineError] = useState<unknown>(null);

  // Sonde de disponibilité du serveur au montage (timeout court).
  useEffect(() => {
    let cancelled = false;
    const probe = new AbortController();
    const timer = setTimeout(() => probe.abort(), MEAL_SERVER_TIMEOUTS.HEALTH_TIMEOUT_MS);
    void fetch(buildHealthRequest().url, { signal: probe.signal })
      .then((res) => {
        if (!cancelled && res.ok) setIsReady(true);
        else if (!cancelled) setEngineError(new Error(`Serveur indisponible (HTTP ${res.status})`));
      })
      .catch((error) => {
        if (!cancelled) setEngineError(error);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      probe.abort();
    };
  }, []);

  const interrupt = () => {
    abortRef.current?.abort();
    return Promise.resolve();
  };
  const interruptRef = useRef(interrupt);
  interruptRef.current = interrupt;

  // Roue à données (opt-in) : sortie brute du modèle conservée pour le diff,
  // un seul record par analyse (addAll OU fermeture, le premier qui arrive).
  const modelItemsRef = useRef<ModelItem[] | null>(null);
  const trainingLoggedRef = useRef(false);
  // Enrichissements IA en vol : « Tout ajouter » les attend pour ne pas
  // sauter un aliment en cours d'ajout à la base.
  const enrichPromisesRef = useRef<Promise<void>[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  // Photo JPEG (512 px) envoyée au serveur d'entraînement avec les corrections.
  const analysisPhotoB64Ref = useRef<string | null>(null);

  // Ne JAMAIS démonter pendant une requête en cours : le flux « demande de
  // retour → interrupt (abort) → attente → fermeture » est factorisé et
  // testé dans lib/mealPhotoExit.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [closePending, setClosePending] = useState(false);

  // Consigne le diff modèle ↔ corrections si l'opt-in est actif. Fire-and-
  // forget : ne bloque jamais l'UI, ne lève jamais. Idempotent par analyse.
  const logTraining = (finalItems: ReviewItem[]) => {
    const modelItems = modelItemsRef.current;
    if (!modelItems || trainingLoggedRef.current) return;
    trainingLoggedRef.current = true;
    void logMealPhotoTraining(
      modelItems,
      finalItems.map((item) => ({
        recognizedName: item.name,
        foodName: item.food?.name ?? null,
        grams: item.grams,
      })),
      analysisPhotoB64Ref.current ?? undefined
    );
  };
  const logTrainingRef = useRef(logTraining);
  logTrainingRef.current = logTraining;

  const exitFlowRef = useRef<ReturnType<typeof createMealPhotoExitFlow> | null>(null);
  if (exitFlowRef.current === null) {
    exitFlowRef.current = createMealPhotoExitFlow({
      interrupt: () => interruptRef.current(),
      close: () => {
        // Fermeture après une analyse réussie (quel que soit le bout) :
        // les corrections faites jusque-là sont aussi une donnée utile.
        if (itemsRef.current) logTrainingRef.current(itemsRef.current);
        onCloseRef.current();
      },
      onPendingChange: setClosePending,
    });
  }
  const exitFlow = exitFlowRef.current;

  // La fermeture demandée pendant une génération se déclenche ici, une fois
  // isGenerating retombé (promesse native terminée après interrupt()).
  useEffect(() => {
    exitFlow.handleGeneratingChange(isGenerating);
  }, [exitFlow, isGenerating]);

  // Filet de sécurité au démontage (démontage parent hors flux UI) : coupe
  // une éventuelle inférence, sans jamais laisser remonter d'exception.
  useEffect(() => {
    return () => safeInterrupt(interruptRef.current);
  }, []);

  const requestClose = () => exitFlow.requestClose(isGenerating);

  // Serveur injoignable : alerte + retour. Le détail est toujours affiché —
  // le message générique masque la cause réelle (réseau, mauvaise IP…).
  useEffect(() => {
    if (!engineError) return;
    const detail =
      engineError instanceof Error ? engineError.message : String(engineError);
    appAlert(
      mt(t, 'mealPhoto.errorTitle'),
      `${mt(t, 'mealPhoto.errorMessage')}\n\n${detail}`,
      [{ text: 'OK', onPress: onClose }]
    );
  }, [engineError, onClose, t]);

  const analyze = async (uri: string) => {
    setIsGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(
      () => controller.abort(),
      MEAL_SERVER_TIMEOUTS.ANALYSIS_TIMEOUT_MS
    );
    try {
      // Réduit la photo avant l'envoi à 512 px : la v9 a été entraînée sur
      // des thumbnails ~512 px (comparator) et hallucine au-delà de ~1024 px
      // (prouvé : pain → "bread" à 512 px, "rice" à 1024+). Bonus : upload
      // ~50-80 Ko, analyse quasi instantanée même en 4G.
      const rendered = await ImageManipulator.manipulate(uri)
        .resize({ width: 512 })
        .renderAsync();
      const saved = await rendered.saveAsync({
        compress: 0.7,
        format: SaveFormat.JPEG,
        base64: true,
      });
      const jpegBase64 = saved.base64;
      if (!jpegBase64) throw new Error('Compression de la photo impossible');
      analysisPhotoB64Ref.current = jpegBase64;
      const request = buildAnalysisRequest(buildPrompt(), jpegBase64, language);
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = extractCompletionText(await response.json());
      if (text === null) throw new Error('Réponse du serveur inattendue');
      const recognized = parseModelOutput(text);

      if (recognized.length === 0) {
        appAlert(mt(t, 'mealPhoto.emptyTitle'), mt(t, 'mealPhoto.emptyMessage'), [
          { text: mt(t, 'mealPhoto.retry'), onPress: resetFlow },
          { text: mt(t, 'mealPhoto.manualEntry'), style: 'cancel', onPress: onClose },
        ]);
        return;
      }

      const foods = getAllFoods();
      const reviewItems = recognized.map((item) => {
        const food = mapItemToFood(item, foods);
        return {
          id: `item-${nextItemId++}`,
          name: item.name,
          grams: item.grams,
          food,
          initialFoodName: food?.name ?? null,
          searching: false,
          searchQuery: '',
        };
      });
      // Sortie brute du pipeline conservée pour la roue à données (texte
      // uniquement — la photo n'est jamais retenue).
      modelItemsRef.current = recognized.map((item, index) => ({
        name: item.name,
        grams: item.grams,
        matchedFoodName: reviewItems[index].initialFoodName,
      }));
      trainingLoggedRef.current = false;
      setItems(reviewItems);

      // Enrichissement IA : tout item sans match local est demandé au serveur
      // (Gemini + cache partagé) → aliment personnalisé ajouté à la base et
      // associé automatiquement. « Tout ajouter » attend ces promesses.
      enrichPromisesRef.current = [];
      for (let i = 0; i < reviewItems.length; i++) {
        if (reviewItems[i].food) continue;
        const queryName = recognized[i].nameFr ?? recognized[i].name;
        updateItem(reviewItems[i].id, { enrichStatus: 'pending' });
        enrichPromisesRef.current.push(enrichUnmatchedItem(reviewItems[i].id, queryName));
      }
    } catch {
      // Sortie demandée pendant l'analyse : interrupt() aborte le fetch — ce
      // n'est pas une erreur, la fermeture suit.
      if (exitFlow.isPending()) return;
      appAlert(mt(t, 'mealPhoto.errorTitle'), mt(t, 'mealPhoto.errorMessage'), [
        { text: 'OK', onPress: onClose },
      ]);
    } finally {
      clearTimeout(timer);
      abortRef.current = null;
      setIsGenerating(false);
    }
  };

  // Analyse automatique dès que la photo est choisie ET le serveur joignable.
  useEffect(() => {
    if (!photoUri || !isReady || analysisStartedRef.current) return;
    analysisStartedRef.current = true;
    void analyze(photoUri);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUri, isReady]);

  function resetFlow() {
    safeInterrupt(interruptRef.current);
    analysisStartedRef.current = false;
    modelItemsRef.current = null;
    trainingLoggedRef.current = false;
    analysisPhotoB64Ref.current = null;
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

  /**
   * Aliment inconnu de la base locale : demande ses valeurs /100 g au serveur
   * (Gemini, cache partagé) puis l'ajoute comme aliment personnalisé et
   * l'associe à l'item. Silencieux en cas d'échec (recherche manuelle reste).
   */
  const enrichUnmatchedItem = async (itemId: string, queryName: string) => {
    const markFailed = () =>
      setItems((current) =>
        current
          ? current.map((item) =>
              item.id === itemId && !item.food ? { ...item, enrichStatus: 'failed' as const } : item
            )
          : current
      );
    try {
      const request = buildFoodInfoRequest(queryName);
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      });
      if (!response.ok) return markFailed();
      const json = (await response.json()) as {
        food?: { name_fr?: string; calories?: number; protein?: number; carbs?: number; fat?: number } | null;
      };
      const info = json.food;
      if (!info || typeof info.calories !== 'number' || info.calories <= 0) return markFailed();
      const slug = (info.name_fr ?? queryName)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const food: Food = {
        id: `ai_${slug}`,
        name: info.name_fr ?? queryName,
        category: 'IA',
        unit: 'g',
        nutritionPer100g: {
          calories: Math.round(info.calories),
          protein: Math.round((info.protein ?? 0) * 10) / 10,
          carbs: Math.round((info.carbs ?? 0) * 10) / 10,
          fat: Math.round((info.fat ?? 0) * 10) / 10,
        },
        isCustom: true,
      };
      addCustomFood(food);
      // N'écrase pas une association manuelle faite entre-temps.
      setItems((current) =>
        current
          ? current.map((item) =>
              item.id === itemId && !item.food ? { ...item, food, enrichStatus: undefined } : item
            )
          : current
      );
    } catch {
      // Réseau/serveur indisponible : l'utilisateur associe manuellement.
      markFailed();
    }
  };

  const removeItem = (id: string) => {
    setItems((current) => (current ? current.filter((item) => item.id !== id) : current));
  };

  const handleAddAll = async () => {
    // Un aliment détecté mais absent de la base est enrichi de façon asynchrone
    // : on attend la fin de ces enrichissements (plafonné à 5 s) pour qu'il
    // soit ajouté au journal ET à la liste des aliments, au lieu d'être sauté.
    if (enrichPromisesRef.current.length > 0) {
      setIsAdding(true);
      try {
        await Promise.race([
          Promise.allSettled(enrichPromisesRef.current),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      } finally {
        setIsAdding(false);
      }
    }

    const items = itemsRef.current;
    if (!items) return;

    // Roue à données : l'état validé est consigné avant enregistrement
    // (no-op si opt-in inactif, jamais bloquant).
    logTraining(items);

    const skipped: string[] = [];
    for (const item of items) {
      if (!item.food || item.grams <= 0) {
        if (item.grams > 0) skipped.push(item.name);
        continue;
      }
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

    // Ne plus jamais masquer un item non identifié : l'utilisateur croit
    // sinon que tout le plat a été enregistré (macros fausses, journal vide).
    if (skipped.length > 0) {
      appAlert(
        mt(t, 'mealPhoto.skippedTitle'),
        mt(t, 'mealPhoto.skippedMessage', { names: skipped.join(', ') })
      );
    }

    onAdded();
  };

  const addableCount = items ? items.filter((item) => item.food !== null && item.grams > 0).length : 0;

  // Ajout manuel d'un aliment oublié par le modèle : carte vide ouverte
  // directement sur la recherche dans la base locale.
  const addManualItem = () => {
    setItems((current) =>
      current
        ? [
            ...current,
            {
              id: `item-${nextItemId++}`,
              name: '',
              grams: 100,
              food: null,
              initialFoodName: null,
              searching: true,
              searchQuery: '',
            },
          ]
        : current
    );
  };

  // Total réactif des items retenus : recalculé à chaque ajustement des
  // steppers, suppression ou re-mappage. Permet de consulter les valeurs
  // estimées sans rien enregistrer (« Tout ajouter » reste optionnel).
  const totals = useMemo(() => {
    if (!items) return null;
    const sum = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const item of items) {
      if (!item.food || item.grams <= 0) continue;
      const nutrition = calculateNutritionForQuantity(item.food, item.grams);
      sum.calories += nutrition.calories;
      sum.protein += nutrition.protein;
      sum.carbs += nutrition.carbs;
      sum.fat += nutrition.fat;
    }
    return sum;
  }, [items]);

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={requestClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={requestClose} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.heading}>{mt(t, 'mealPhoto.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!isReady ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{mt(t, 'mealPhoto.modelLoading')}</Text>
              <ActivityIndicator color={c.primary} />
            </View>
          ) : null}

          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : null}

          {isGenerating || closePending ? (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color={c.primary} />
              <Text style={styles.muted}>
                {mt(t, closePending ? 'mealPhoto.closing' : 'mealPhoto.analyzing')}
              </Text>
            </View>
          ) : null}

          {!items ? (
            <View style={styles.actions}>
              <Button
                title={mt(t, 'mealPhoto.takePhoto')}
                onPress={() => void pickImage('camera')}
                disabled={!isReady || isGenerating}
              />
              <Button
                title={mt(t, 'mealPhoto.pickFromGallery')}
                variant="secondary"
                onPress={() => void pickImage('gallery')}
                disabled={!isReady || isGenerating}
              />
            </View>
          ) : (
            <>
              {totals ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{mt(t, 'mealPhoto.totalTitle')}</Text>
                  <Text style={styles.totalCalories}>{totals.calories} kcal</Text>
                  <Text style={styles.totalMacros}>
                    {t('nutrition.facts.protein')} {formatMacro(totals.protein)} g
                    {' · '}
                    {t('nutrition.facts.carbs')} {formatMacro(totals.carbs)} g
                    {' · '}
                    {t('nutrition.facts.fat')} {formatMacro(totals.fat)} g
                  </Text>
                  <Text style={styles.muted}>{mt(t, 'mealPhoto.totalHint')}</Text>
                </View>
              ) : null}

              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={18} color={c.primary} />
                <Text style={styles.warningText}>{mt(t, 'mealPhoto.warningBanner')}</Text>
              </View>

              {items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name || mt(t, 'mealPhoto.addItem')}
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
                          {item.enrichStatus === 'pending'
                            ? mt(t, 'mealPhoto.enriching')
                            : `${mt(t, 'mealPhoto.notFound')} — ${mt(t, 'mealPhoto.searchManually')}`}
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
                  onPress={() => void handleAddAll()}
                  loading={isAdding}
                  disabled={addableCount === 0 && !isAdding}
                />
                <Button
                  title={mt(t, 'mealPhoto.addItem')}
                  variant="secondary"
                  onPress={addManualItem}
                />
                <Button title={mt(t, 'mealPhoto.retry')} variant="secondary" onPress={resetFlow} />
              </View>
            </>
          )}
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
  totalCalories: { fontSize: 26, fontFamily: fonts.sansHeavy, color: c.primary },
  totalMacros: { fontSize: 13, fontFamily: fonts.sansBold, color: c.textSecondary },
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
