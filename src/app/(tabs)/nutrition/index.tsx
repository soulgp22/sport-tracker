import { useCallback, useMemo, useReducer, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MacroBar } from '../../../components/nutrition/MacroBar';
import { appAlert } from '../../../components/ui/AppDialog';
import { Button } from '../../../components/ui/Button';
import { useColors } from '../../../theme/useColors';
import { QuickCaloriesModal } from './QuickCaloriesModal';
import type { ThemeColors } from '../../../theme/palettes';
import { fonts } from '../../../theme/fonts';
import { radius, spacing } from '../../../theme/tokens';
import { collectMealGroups, mealTypeLabel } from '../../../constants/meals';
import {
  calculateDailyTotals,
  calculateGoalProgress,
  calculateRemainingGoals,
} from '../../../lib/nutritionCalc';
import {
  missingEnergyProfileFields,
  resolveDailyEnergyBalance,
  resolveDailyEnergyExpenditure,
} from '../../../lib/energyBalance';
import {
  openHealthConnectPermissionsForApp,
  requestHealthPermissionsWithStatus,
} from '../../../lib/healthConnect';
import { useHealthToday } from '../../../hooks/useHealthToday';
import { getBodyweightForDate } from '../../../lib/performanceEngine';
import { healthConnectT as hct } from '../../../i18n/healthConnectFallback';
import {
  FOODS_CATALOG_DESTINATION,
  PROFILE_COMPLETION_DESTINATION,
} from '../../../constants/routes';
import { useTranslation } from '../../../i18n/useTranslation';
import { useBodyWeightStore } from '../../../store/bodyWeightStore';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';
import { usePerformanceStore } from '../../../store/performanceStore';
import type { MealType } from '../../../types';

const HC_PACKAGE = 'com.google.android.apps.healthdata';

/** Ouvre la fiche Play Store de Health Connect (intent market://, repli navigateur). */
async function openHealthConnectPlayStore() {
  try {
    await Linking.openURL(`market://details?id=${HC_PACKAGE}`);
  } catch {
    try {
      await Linking.openURL(`https://play.google.com/store/apps/details?id=${HC_PACKAGE}`);
    } catch {
      // Aucun store ni navigateur disponible : rien de plus à faire.
    }
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatMacro(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace('.', ',');
}

function roundedMacro(value: number) {
  return Number(formatMacro(value).replace(',', '.'));
}

export default function NutritionScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [, forceTick] = useReducer((x: number) => x + 1, 0);
  const goals = useNutritionGoalsStore((s) => s.goals);
  const entriesState = useFoodDiaryStore((s) => s.entries);
  const getEntriesByDate = useFoodDiaryStore((s) => s.getEntriesByDate);
  const addFoodEntry = useFoodDiaryStore((s) => s.addFoodEntry);
  const sex = usePerformanceStore((s) => s.sex);
  const age = usePerformanceStore((s) => s.age);
  const heightCm = usePerformanceStore((s) => s.heightCm);
  const activityLevel = usePerformanceStore((s) => s.activityLevel);
  const weightEntries = useBodyWeightStore((s) => s.entries);
  const { healthData, loadHealthToday: loadHealthBurn } = useHealthToday();
  const [connecting, setConnecting] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      forceTick();
    }, [forceTick])
  );

  const handleConnectHealth = async () => {
    setConnecting(true);
    try {
      const result = await requestHealthPermissionsWithStatus();
      if (result.granted) {
        await loadHealthBurn();
        return;
      }
      // Plus jamais d'échec silencieux : chaque cas a son message.
      if (result.status === 'not-installed' || result.status === 'needs-update') {
        const isUpdate = result.status === 'needs-update';
        appAlert(
          hct(t, isUpdate ? 'nutrition.healthConnect.updateTitle' : 'nutrition.healthConnect.installTitle'),
          hct(t, isUpdate ? 'nutrition.healthConnect.updateMessage' : 'nutrition.healthConnect.installMessage'),
          [
            { text: hct(t, 'nutrition.healthConnect.later'), style: 'cancel' },
            {
              text: hct(t, 'nutrition.healthConnect.openPlayStore'),
              onPress: () => void openHealthConnectPlayStore(),
            },
          ]
        );
        return;
      }
      if (result.error) {
        appAlert(hct(t, 'nutrition.healthConnect.errorTitle'), result.error);
        return;
      }
      // SDK disponible mais permissions refusées : guider vers les réglages HC.
      // Refus instantané sans feuille = appli sideloadée bloquée par HC.
      appAlert(
        hct(t, 'nutrition.healthConnect.deniedTitle'),
        result.instantDenial
          ? hct(t, 'nutrition.healthConnect.sideloadedMessage')
          : `${hct(t, 'nutrition.healthConnect.deniedMessage')}\n\n(détail : statut=${result.status})`,
        [
          { text: hct(t, 'nutrition.healthConnect.later'), style: 'cancel' },
          {
            text: hct(t, 'nutrition.healthConnect.openSettings'),
            onPress: () => void openHealthConnectPermissionsForApp(),
          },
        ]
      );
    } finally {
      setConnecting(false);
    }
  };

  const today = todayKey();
  const entries = useMemo(
    () => getEntriesByDate(today),
    [entriesState, getEntriesByDate, today]
  );
  const totals = useMemo(() => calculateDailyTotals(entries), [entries]);
  const remaining = useMemo(() => calculateRemainingGoals(totals, goals), [goals, totals]);
  const progress = useMemo(() => calculateGoalProgress(totals, goals), [goals, totals]);

  const mealGroups = useMemo(() => collectMealGroups(entries), [entries]);
  const meals = useMemo(
    () =>
      mealGroups.map((mealType) => {
        const mealEntries = entries.filter((entry) => entry.mealType === mealType);
        return {
          mealType,
          label: mealTypeLabel(mealType, t),
          count: mealEntries.length,
          kcal: calculateDailyTotals(mealEntries).calories,
        };
      }),
    [mealGroups, entries, t]
  );

  const goPhoto = () => router.push('/(tabs)/nutrition/photo' as never);

  const handleQuickAdd = (payload: { calories: number; mealType: MealType; label: string }) => {
    addFoodEntry({
      date: todayKey(),
      mealType: payload.mealType,
      foodId: 'quick-calories',
      foodName: payload.label || t('nutrition.quickAdd.defaultLabel'),
      quantity: 1,
      unit: 'portion',
      calculatedNutrition: { calories: payload.calories, protein: 0, carbs: 0, fat: 0 },
    });
    setQuickAddVisible(false);
  };

  const weightKg = getBodyweightForDate(weightEntries, new Date().toISOString());
  const missingFields = missingEnergyProfileFields({ sex, heightCm, ageYears: age }, weightKg);
  const expenditure = resolveDailyEnergyExpenditure({
    healthCalories: healthData.status === 'granted' ? healthData.calories : null,
    healthSteps: healthData.status === 'granted' ? healthData.steps : null,
    profile: { sex, weightKg, heightCm, ageYears: age, activityLevel },
  });
  const burned = expenditure.totalKcal;
  const balance = resolveDailyEnergyBalance(burned, totals.calories);
  const showProfileInvite = missingFields.length > 0;
  const missingFieldsLabel = missingFields
    .map((field) => hct(t, `nutrition.balance.field.${field}`))
    .join(', ');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. En-tête : kicker + titre + réglages objectifs */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerKicker}>{t('nav.nutrition')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/nutrition/goals' as never)}
              style={styles.headerActionBtn}
              hitSlop={8}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('foods.accessibility.settings')}>
              <Ionicons name="settings-outline" size={22} color={c.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>{t('nutrition.title')}</Text>
        </View>

        {/* 2. Action principale photo + sous-actions */}
        <View style={styles.actionWrap}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={goPhoto}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={t('home.analyzeMeal')}>
            <Text style={styles.actionTitle}>{t('home.analyzeMeal')}</Text>
            <Text style={styles.actionSubtitle}>{t('nutrition.analyzeSubtitle')}</Text>
          </TouchableOpacity>
          <View style={styles.subActions}>
            {/* Cette sous-action appelait `goPhoto`, exactement comme la carte
                « Analyser un plat » 10 px au-dessus : deux contrôles identiques
                côte à côte. Elle ouvre désormais le lecteur de code-barres, une
                troisième entrée réellement distincte (photo IA / scan / saisie). */}
            <TouchableOpacity
              style={[styles.subAction, styles.subActionDivider]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/nutrition/add' as never,
                  params: { scan: '1' },
                } as never)
              }
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={t('nutrition.scan.button')}>
              <Text style={styles.subActionLabel}>{t('nutrition.scan.button')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.subAction}
              onPress={() => router.push('/(tabs)/nutrition/add' as never)}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={t('nutrition.addMeal')}>
              <Text style={styles.subActionLabel}>{t('nutrition.addMeal')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Liste des repas du jour */}
        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>{t('nutrition.today')}</Text>
          {meals.length === 0 ? (
            <Text style={styles.emptyMeals}>{t('nutrition.diary.emptyTitle')}</Text>
          ) : (
            meals.map((meal) => (
              <View key={meal.mealType} style={styles.mealRow}>
                <View style={styles.mealCopy}>
                  <Text style={styles.mealName} numberOfLines={1}>
                    {meal.label}
                  </Text>
                  <Text style={styles.mealDetail}>
                    {t('nutrition.mealItems', { count: meal.count })}
                  </Text>
                </View>
                <View style={styles.mealKcalCol}>
                  <Text style={styles.mealKcal}>{meal.kcal}</Text>
                  <Text style={styles.mealKcalUnit}>kcal</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 4. Bilan du jour (conservé, déplacé sous la liste des repas) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('nutrition.balance.title')}</Text>

          <View style={styles.balanceRow}>
            <View style={[styles.balanceCol, styles.balanceColDivider]}>
              <Text style={styles.balanceValue}>{totals.calories}</Text>
              <Text style={styles.balanceLabel}>{t('nutrition.balance.consumed')}</Text>
            </View>
            <View style={styles.balanceCol}>
              <Text style={styles.balanceValue}>{burned === null ? '—' : burned}</Text>
              <Text style={styles.balanceLabel}>{t('nutrition.balance.burned')}</Text>
            </View>
          </View>

          <View style={styles.sectionBody}>
          {balance.status !== 'unavailable' ? (
            <Text style={[styles.balanceHint, balance.status === 'over' ? styles.overGoal : null]}>
              {balance.status === 'remaining'
                ? t('nutrition.balance.remaining', { count: balance.count })
                : t('nutrition.balance.over', { count: balance.count })}
            </Text>
          ) : null}

          {expenditure.basalKcal !== null ? (
            <>
              <Text style={styles.balanceHint}>
                {t('nutrition.balance.decompositionMetabolism')}{' '}
                {expenditure.basalKcal} kcal  ·  {' '}
                {t('nutrition.balance.decompositionActivity')}{' '}
                {expenditure.activityKcal ?? 0} kcal
              </Text>
              <Text style={styles.balanceSource}>
                {t(expenditure.basalSourceLabelKey)}  ·  {t(expenditure.activitySourceLabelKey)}
              </Text>
              {(expenditure.activitySource === 'healthConnectActive' ||
                expenditure.activitySource === 'healthConnectDerived') ? (
                <Text style={styles.balanceHint}>
                  {t('nutrition.balance.activityPartialNote')}
                </Text>
              ) : null}
              {expenditure.activityIsEstimated ? (
                <Text style={styles.balanceHint}>
                  {t('nutrition.balance.activityEstimatedNote')}
                </Text>
              ) : null}
              {expenditure.usedDefaultWeight ? (
                <Text style={styles.balanceHint}>{t('nutrition.balance.stepsDefaultWeight')}</Text>
              ) : null}
            </>
          ) : null}

          {healthData.status !== 'granted' ? (
            <Button
              title={t('nutrition.balance.connect')}
              onPress={handleConnectHealth}
              loading={connecting}
            />
          ) : null}

          {showProfileInvite ? (
            <>
              <Text style={styles.balanceHint}>{t('nutrition.balance.completeProfile')}</Text>
              {missingFields.length > 0 ? (
                <Text style={styles.balanceHint}>
                  {hct(t, 'nutrition.balance.missingFields', { fields: missingFieldsLabel })}
                </Text>
              ) : null}
              <Button
                title={t('nutrition.balance.completeProfileCta')}
                variant="secondary"
                onPress={() => router.push(PROFILE_COMPLETION_DESTINATION as never)}
              />
            </>
          ) : null}
          </View>
        </View>
        {/* 5. Macros (conservé) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('nutrition.macros')}</Text>

          <View style={styles.sectionBody}>
            <MacroBar
              label={t('nutrition.form.calories')}
              current={totals.calories}
              goal={goals.dailyCalories}
              unit="kcal"
              percent={progress.calories}
            />
            <Text style={[styles.remaining, remaining.calories < 0 ? styles.overGoal : null]}>
              {remaining.calories >= 0
                ? t('nutrition.remaining', { count: remaining.calories })
                : t('nutrition.overGoal', { count: Math.abs(remaining.calories) })}
            </Text>
            <MacroBar
              label={t('nutrition.facts.protein')}
              current={roundedMacro(totals.protein)}
              goal={roundedMacro(goals.protein)}
              unit="g"
              percent={progress.protein}
            />
            <MacroBar
              label={t('nutrition.facts.carbs')}
              current={roundedMacro(totals.carbs)}
              goal={roundedMacro(goals.carbs)}
              unit="g"
              percent={progress.carbs}
            />
            <MacroBar
              label={t('nutrition.facts.fat')}
              current={roundedMacro(totals.fat)}
              goal={roundedMacro(goals.fat)}
              unit="g"
              percent={progress.fat}
            />
          </View>
        </View>

        {/* 6. Actions */}
        <View style={styles.section}>
          <View style={styles.actions}>
            <Button
              title={t('nutrition.addMeal')}
              onPress={() => router.push('/(tabs)/nutrition/add' as never)}
            />
            <Button
              title={t('nutrition.quickAdd')}
              variant="secondary"
              onPress={() => setQuickAddVisible(true)}
            />
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => router.push(FOODS_CATALOG_DESTINATION as never)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={t('nav.foods')}>
                <Feather name="list" size={20} color={c.primary} />
                <Text style={styles.iconActionLabel}>{t('nav.foods')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => router.push('/(tabs)/nutrition/diary' as never)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={t('nutrition.diaryTitle')}>
                <Feather name="book-open" size={20} color={c.primary} />
                <Text style={styles.iconActionLabel}>{t('nutrition.diaryTitle')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => router.push('/(tabs)/nutrition/history' as never)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={t('nutrition.historyTitle')}>
                <Feather name="clock" size={20} color={c.primary} />
                <Text style={styles.iconActionLabel}>{t('nutrition.historyTitle')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => router.push('/(tabs)/nutrition/goals' as never)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={t('nutrition.goals.title')}>
                <Feather name="target" size={20} color={c.primary} />
                <Text style={styles.iconActionLabel}>{t('nutrition.goals.title')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <QuickCaloriesModal
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
        onSubmit={handleQuickAdd}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingBottom: 32 },

    // En-tête
    header: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 14,
      borderBottomWidth: 2,
      borderBottomColor: c.border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerActionBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerKicker: {
      fontFamily: fonts.serifBold,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 1.54,
      textTransform: 'uppercase',
      color: c.secondary,
    },
    headerTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 34,
      lineHeight: 40,
      marginTop: 6,
      color: c.textPrimary,
    },

    // Action principale + sous-actions
    actionWrap: { padding: 20, paddingBottom: 4 },
    actionButton: {
      minHeight: 88,
      paddingHorizontal: 20,
      paddingVertical: 18,
      justifyContent: 'center',
      gap: 6,
      borderRadius: radius.lg,
      backgroundColor: c.tertiary,
    },
    actionTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 26,
      lineHeight: 28,
      color: c.primaryText,
    },
    actionSubtitle: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      marginTop: 6,
      color: c.primaryText,
      opacity: 0.85,
    },
    subActions: {
      flexDirection: 'row',
      marginTop: 12,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    subAction: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: 14,
      paddingVertical: 12,
      justifyContent: 'center',
    },
    subActionDivider: { borderRightWidth: 1, borderRightColor: c.border },
    subActionLabel: {
      fontFamily: fonts.serifBold,
      fontSize: 12,
      lineHeight: 15,
      letterSpacing: 0.96,
      textTransform: 'uppercase',
      color: c.textPrimary,
    },

    // Liste des repas
    mealsSection: { paddingTop: 20 },
    sectionTitle: {
      paddingHorizontal: 20,
      paddingBottom: 8,
      fontFamily: fonts.serifBold,
      fontSize: 16,
      lineHeight: 20,
      color: c.textPrimary,
    },
    mealRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderTopWidth: 1,
      borderTopColor: c.border,
      minHeight: 66,
    },
    mealCopy: { flex: 1, minWidth: 0 },
    mealName: { fontFamily: fonts.serifBold, fontSize: 16, lineHeight: 20, color: c.textPrimary },
    mealDetail: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 3,
      color: c.textSecondary,
    },
    mealKcalCol: { alignItems: 'flex-end' },
    mealKcal: { fontFamily: fonts.serifBold, fontSize: 20, lineHeight: 24, color: c.textPrimary },
    mealKcalUnit: {
      fontFamily: fonts.sans,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: c.textMuted,
    },
    emptyMeals: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      paddingHorizontal: 20,
      paddingVertical: 13,
      color: c.textMuted,
    },

    // Sections conservées (bilan, macros, actions)
    section: {
      borderTopWidth: 2,
      borderTopColor: c.border,
      paddingTop: 18,
    },
    sectionBody: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
      gap: 12,
    },

    balanceRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    balanceCol: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 16,
      alignItems: 'center',
      gap: 4,
    },
    balanceColDivider: { borderRightWidth: 1, borderRightColor: c.border },
    balanceValue: { fontFamily: fonts.serifBold, fontSize: 26, lineHeight: 30, color: c.primary },
    balanceLabel: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 15, color: c.textSecondary },
    balanceHint: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: c.textSecondary },
    balanceSource: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 15, color: c.textMuted },
    overGoal: { color: c.danger },

    remaining: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 20, color: c.textSecondary },

    actions: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
      gap: 12,
    },
    actionsRow: { flexDirection: 'row', gap: 8 },
    iconAction: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      backgroundColor: c.surface,
    },
    iconActionLabel: {
      fontFamily: fonts.sansSemi,
      fontSize: 10,
      lineHeight: 13,
      textAlign: 'center',
      color: c.textSecondary,
    },
  });
