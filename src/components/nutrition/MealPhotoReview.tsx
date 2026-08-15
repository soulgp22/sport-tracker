import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import { TextInput } from '../ui/TextInput';
import { useTranslation } from '../../i18n/useTranslation';
import { mealPhotoT as mt } from '../../i18n/mealPhotoFallback';
import { useColors } from '../../theme/useColors';
import { RAMP_WARM, type ThemeColors } from '../../theme/palettes';
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

// La maquette impose des blancs avec opacité (65 % et 40 %) sur fond sombre.
// La palette ne contient aucun jeton « blanc » : on les déclare ici, à côté de
// la maquette, plutôt que d'éparpiller des couleurs en dur dans les styles.
const WHITE_65 = 'rgba(255, 255, 255, 0.65)';
const WHITE_40 = 'rgba(255, 255, 255, 0.40)';

const progressStyles = StyleSheet.create({
  track: { height: 6, width: '100%', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, height: 6 },
});

/**
 * Barre de progression INDÉTERMINÉE : le serveur ne renvoie aucun pourcentage,
 * on ne peut donc pas en afficher un. Une portion de 40 % parcourt la piste en
 * aller-retour (Animated), sans dépendance nouvelle.
 */
function IndeterminateBar({ trackColor, fillColor }: { trackColor: string; fillColor: string }) {
  const [translateX] = useState(() => new Animated.Value(0));
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (trackWidth <= 0) return;
    const fillWidth = trackWidth * 0.4;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: trackWidth - fillWidth,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [trackWidth, translateX]);

  return (
    <View
      style={[progressStyles.track, { backgroundColor: trackColor }]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}>
      <Animated.View
        style={[
          progressStyles.fill,
          { backgroundColor: fillColor, width: '40%', transform: [{ translateX }] },
        ]}
      />
    </View>
  );
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

  const showAnalyzing = isGenerating || closePending || (photoUri !== null && !items);
  const screen: 'loading' | 'capture' | 'analyzing' | 'result' = showAnalyzing
    ? 'analyzing'
    : items
      ? 'result'
      : !isReady
        ? 'loading'
        : 'capture';

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={requestClose}>
      <SafeAreaView
        style={[styles.safe, screen === 'capture' && styles.safeCapture]}
        edges={['top', 'bottom']}>
        {screen === 'loading' ? (
          <View style={styles.centerScreen}>
            <ActivityIndicator color={c.primary} />
            <Text style={styles.loadingText}>{mt(t, 'mealPhoto.modelLoading')}</Text>
          </View>
        ) : screen === 'capture' ? (
          <View style={styles.captureScreen}>
            <View style={styles.captureHeader}>
              <TouchableOpacity onPress={requestClose} hitSlop={8} activeOpacity={0.7}>
                <Text style={styles.captureCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.captureHint}>{mt(t, 'mealPhoto.frameHint')}</Text>
            </View>

            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>

            <View style={styles.captureActions}>
              <TouchableOpacity
                style={[styles.captureButton, styles.captureButtonSolid]}
                onPress={() => void pickImage('camera')}
                activeOpacity={0.8}
                accessibilityRole="button">
                <Text style={styles.captureButtonSolidText}>{mt(t, 'mealPhoto.capture')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.captureButton, styles.captureButtonOutline]}
                onPress={() => void pickImage('gallery')}
                activeOpacity={0.8}
                accessibilityRole="button">
                <Text style={styles.captureButtonOutlineText}>{t('nutrition.import')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : screen === 'analyzing' ? (
          <View style={styles.centerScreen}>
            <Text style={styles.kicker}>{mt(t, 'mealPhoto.analyzingKicker')}</Text>
            <Text style={styles.analyzingTitle}>{mt(t, 'mealPhoto.analyzingTitle')}</Text>
            <View style={styles.progressBarWrap}>
              <IndeterminateBar trackColor={c.border} fillColor={c.primary} />
            </View>
            <Text style={styles.analyzingSubtitle}>
              {mt(t, closePending ? 'mealPhoto.closing' : 'mealPhoto.analyzingSubtitle')}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.resultHeader}>
              <TouchableOpacity
                onPress={requestClose}
                hitSlop={8}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('nav.nutrition')}>
                <Text style={styles.resultBack}>← {t('nav.nutrition')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={resetFlow}
                hitSlop={8}
                activeOpacity={0.7}
                accessibilityRole="button">
                <Text style={styles.resultRetry}>{mt(t, 'mealPhoto.retry')}</Text>
              </TouchableOpacity>
            </View>

            {photoUri ? (
              <View style={styles.photoWrap}>
                <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              </View>
            ) : null}

            <View style={styles.resultHeading}>
              <Text style={styles.kicker}>{mt(t, 'mealPhoto.detectedKicker')}</Text>
              <Text style={styles.resultTitle}>
                {mt(t, 'mealPhoto.detectedCount', { count: items!.length })}
              </Text>
            </View>

            <View style={styles.warningLine}>
              <Ionicons name="warning-outline" size={16} color={c.textSecondary} />
              <Text style={styles.warningText}>{mt(t, 'mealPhoto.warningBanner')}</Text>
            </View>

            {items!.map((item) => {
              const nutrition = item.food
                ? calculateNutritionForQuantity(item.food, item.grams)
                : null;
              return (
                <View key={item.id} style={styles.foodItem}>
                  <View style={styles.foodItemTop}>
                    <Text style={styles.foodName} numberOfLines={1}>
                      {item.name || mt(t, 'mealPhoto.addItem')}
                    </Text>
                    {nutrition ? <Text style={styles.foodKcal}>{nutrition.calories}</Text> : null}
                  </View>

                  {nutrition ? (
                    <Text style={styles.foodMacros}>
                      {t('nutrition.facts.protein')} {formatMacro(nutrition.protein)} g
                      {' · '}
                      {t('nutrition.facts.carbs')} {formatMacro(nutrition.carbs)} g
                      {' · '}
                      {t('nutrition.facts.fat')} {formatMacro(nutrition.fat)} g
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

                  <View style={styles.foodItemControls}>
                    <View style={styles.gramsRow}>
                      <TouchableOpacity
                        style={[
                          styles.stepButton,
                          item.grams - GRAM_STEP < MIN_STEP_GRAMS && styles.stepButtonDisabled,
                        ]}
                        onPress={() => updateItem(item.id, { grams: item.grams - GRAM_STEP })}
                        disabled={item.grams - GRAM_STEP < MIN_STEP_GRAMS}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="-25 g">
                        <Text style={styles.stepButtonText}>−</Text>
                      </TouchableOpacity>
                      <View style={styles.gramsField}>
                        <Text style={styles.gramsValue}>{item.grams} g</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.stepButton}
                        onPress={() => updateItem(item.id, { grams: item.grams + GRAM_STEP })}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel="+25 g">
                        <Text style={styles.stepButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      hitSlop={8}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.delete')}>
                      <Text style={styles.deleteButton}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.addItemButton}
              onPress={addManualItem}
              activeOpacity={0.8}
              accessibilityRole="button">
              <Text style={styles.addItemButtonText}>+ {mt(t, 'mealPhoto.addItem')}</Text>
            </TouchableOpacity>

            {totals ? (
              <View style={styles.totalBlock}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{mt(t, 'mealPhoto.totalLabel')}</Text>
                  <View style={styles.totalCaloriesCol}>
                    <Text style={styles.totalCaloriesValue}>{totals.calories}</Text>
                    <Text style={styles.totalCaloriesUnit}>kcal</Text>
                  </View>
                </View>
                <View style={styles.macroRow}>
                  <View style={[styles.macroCol, styles.macroColDivider]}>
                    <Text style={styles.macroLabel}>{t('nutrition.facts.protein')}</Text>
                    <Text style={styles.macroValue}>{formatMacro(totals.protein)} g</Text>
                  </View>
                  <View style={[styles.macroCol, styles.macroColDivider]}>
                    <Text style={styles.macroLabel}>{t('nutrition.facts.carbs')}</Text>
                    <Text style={styles.macroValue}>{formatMacro(totals.carbs)} g</Text>
                  </View>
                  <View style={styles.macroCol}>
                    <Text style={styles.macroLabel}>{t('nutrition.facts.fat')}</Text>
                    <Text style={styles.macroValue}>{formatMacro(totals.fat)} g</Text>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.addToDayWrap}>
              <TouchableOpacity
                style={[
                  styles.addToDayButton,
                  addableCount === 0 && !isAdding && styles.addToDayDisabled,
                ]}
                onPress={() => void handleAddAll()}
                disabled={addableCount === 0 && !isAdding}
                activeOpacity={0.8}
                accessibilityRole="button">
                {isAdding ? (
                  <ActivityIndicator color={c.bg} size="small" />
                ) : (
                  <Text style={styles.addToDayText}>{mt(t, 'mealPhoto.addToDay')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  safeCapture: { backgroundColor: RAMP_WARM[900] },
  content: { paddingBottom: 32 },

  // Prise de vue (plein écran sombre)
  captureScreen: { flex: 1, backgroundColor: RAMP_WARM[900] },
  captureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  captureCancel: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.12,
    textTransform: 'uppercase',
    color: c.bg,
  },
  captureHint: {
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: WHITE_65,
  },
  viewfinder: { flex: 1, marginHorizontal: 20, backgroundColor: RAMP_WARM[800] },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: c.secondary },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  captureActions: { flexDirection: 'row', gap: 12, padding: 20 },
  captureButton: {
    flex: 1,
    height: 64,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  captureButtonSolid: { backgroundColor: c.bg },
  captureButtonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: WHITE_40 },
  captureButtonSolidText: {
    fontFamily: fonts.serifBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.12,
    textTransform: 'uppercase',
    color: c.primary,
  },
  captureButtonOutlineText: {
    fontFamily: fonts.serifBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.12,
    textTransform: 'uppercase',
    color: c.bg,
  },

  // Écrans centrés (chargement du moteur / analyse)
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  kicker: {
    fontFamily: fonts.serifBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
    color: c.secondary,
    textAlign: 'center',
  },
  analyzingTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    lineHeight: 36,
    marginTop: 8,
    color: c.textPrimary,
    textAlign: 'center',
  },
  progressBarWrap: { width: '100%', marginTop: 24 },
  analyzingSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 16,
    color: c.textSecondary,
    textAlign: 'center',
  },
  loadingText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    color: c.textSecondary,
  },
  // Résultat
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  resultBack: {
    fontFamily: fonts.serifBold,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    color: c.textPrimary,
  },
  resultRetry: {
    fontFamily: fonts.serifBold,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    color: c.secondary,
  },
  photoWrap: { paddingHorizontal: 20 },
  photo: { width: '100%', height: 170, backgroundColor: c.surfaceAlt },
  resultHeading: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  resultTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    lineHeight: 32,
    marginTop: 6,
    color: c.textPrimary,
  },
  warningLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  warningText: { flex: 1, fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: c.textSecondary },

  foodItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  foodItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  foodName: { flex: 1, fontFamily: fonts.serifBold, fontSize: 16, lineHeight: 20, color: c.textPrimary },
  foodKcal: { fontFamily: fonts.serifBold, fontSize: 18, lineHeight: 22, color: c.textPrimary },
  foodMacros: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, marginTop: 4, color: c.secondary },
  foodItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },

  // Recherche manuelle (aliment sans match)
  itemSearchBlock: { gap: 8, marginTop: 8 },
  itemNotFound: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 17, color: c.textSecondary },
  itemSearch: { gap: 6 },
  searchResult: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchResultText: { fontFamily: fonts.sans, fontSize: 13, color: c.textPrimary },

  // Stepper de grammage
  gramsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  stepButtonDisabled: { opacity: 0.4 },
  stepButtonText: { fontFamily: fonts.sansBold, fontSize: 20, lineHeight: 22, color: c.textPrimary },
  gramsField: {
    minWidth: 78,
    height: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  gramsValue: { fontFamily: fonts.sansHeavy, fontSize: 18, lineHeight: 22, color: c.textPrimary },
  deleteButton: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },

  // « + Ajouter un aliment » (filet 2 px en dessous)
  addItemButton: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 2,
    borderBottomColor: c.border,
  },
  addItemButtonText: {
    fontFamily: fonts.serifBold,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    color: c.textPrimary,
  },

  // Total + macros
  totalBlock: { paddingHorizontal: 20, paddingTop: 18 },
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  totalLabel: { fontFamily: fonts.serifBold, fontSize: 16, lineHeight: 20, color: c.textPrimary },
  totalCaloriesCol: { alignItems: 'flex-end' },
  totalCaloriesValue: { fontFamily: fonts.displayHeavy, fontSize: 38, lineHeight: 40, color: c.primary },
  totalCaloriesUnit: {
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.textMuted,
  },
  macroRow: {
    flexDirection: 'row',
    marginTop: 16,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: c.border,
  },
  macroCol: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  macroColDivider: { borderRightWidth: 1, borderRightColor: c.border },
  macroLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.textMuted,
  },
  macroValue: { fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 24, color: c.textPrimary },

  // « Ajouter à ma journée »
  addToDayWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  addToDayButton: {
    backgroundColor: c.primary,
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  addToDayDisabled: { opacity: 0.5 },
  addToDayText: {
    fontFamily: fonts.serifBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 1.12,
    textTransform: 'uppercase',
    color: c.bg,
  },
});
