import { useCallback, useMemo, useReducer, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MacroBar } from '../../../components/nutrition/MacroBar';
import { appAlert } from '../../../components/ui/AppDialog';
import { Button } from '../../../components/ui/Button';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { fonts } from '../../../theme/fonts';
import { makeShadows, makeTypeScale, radius, spacing } from '../../../theme/tokens';
import {
  calculateDailyTotals,
  calculateGoalProgress,
  calculateRemainingGoals,
} from '../../../lib/nutritionCalc';
import { calculateTdee, missingEnergyProfileFields } from '../../../lib/energyBalance';
import {
  hasHealthPermissions,
  isHealthConnectAvailable,
  openHealthConnectPermissionsForApp,
  readCaloriesBurnedToday,
  requestHealthPermissionsWithStatus,
} from '../../../lib/healthConnect';
import { getBodyweightForDate } from '../../../lib/performanceEngine';
import { healthConnectT as hct } from '../../../i18n/healthConnectFallback';
import { useTranslation } from '../../../i18n/useTranslation';
import { useBodyWeightStore } from '../../../store/bodyWeightStore';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';
import { usePerformanceStore } from '../../../store/performanceStore';

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
  const sex = usePerformanceStore((s) => s.sex);
  const age = usePerformanceStore((s) => s.age);
  const heightCm = usePerformanceStore((s) => s.heightCm);
  const activityLevel = usePerformanceStore((s) => s.activityLevel);
  const weightEntries = useBodyWeightStore((s) => s.entries);
  const [healthBurn, setHealthBurn] = useState<
    { status: 'granted'; burned: number } | { status: 'needsPermission' } | { status: 'unavailable' }
  >({ status: 'unavailable' });
  const [connecting, setConnecting] = useState(false);

  const loadHealthBurn = useCallback(async () => {
    const available = await isHealthConnectAvailable();
    if (!available) {
      setHealthBurn({ status: 'unavailable' });
      return;
    }
    const granted = await hasHealthPermissions();
    if (!granted) {
      setHealthBurn({ status: 'needsPermission' });
      return;
    }
    const calories = await readCaloriesBurnedToday();
    if (!calories) {
      setHealthBurn({ status: 'unavailable' });
      return;
    }
    setHealthBurn({
      status: 'granted',
      burned: calories.total > 0 ? calories.total : calories.active,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      forceTick();
      loadHealthBurn();
    }, [loadHealthBurn])
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

  const weightKg = getBodyweightForDate(weightEntries, new Date().toISOString());
  const tdee = calculateTdee({ sex, weightKg, heightCm, ageYears: age, activityLevel });
  const burned = healthBurn.status === 'granted' ? healthBurn.burned : tdee;
  const balance = burned === null ? null : burned - totals.calories;
  const showProfileInvite = healthBurn.status !== 'granted' && tdee === null;
  const missingFields = missingEnergyProfileFields({ sex, heightCm, ageYears: age }, weightKg);
  const missingFieldsLabel = missingFields
    .map((field) => hct(t, `nutrition.balance.field.${field}`))
    .join(', ');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('nutrition.balance.title')}</Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceCol}>
              <Text style={styles.balanceValue}>{totals.calories}</Text>
              <Text style={styles.balanceLabel}>{t('nutrition.balance.consumed')}</Text>
            </View>
            <View style={styles.balanceCol}>
              <Text style={styles.balanceValue}>{burned === null ? '—' : burned}</Text>
              <Text style={styles.balanceLabel}>{t('nutrition.balance.burned')}</Text>
            </View>
          </View>

          {balance !== null ? (
            <Text style={[styles.balanceHint, balance < 0 ? styles.overGoal : null]}>
              {balance >= 0
                ? t('nutrition.balance.remaining', { count: balance })
                : t('nutrition.balance.over', { count: Math.abs(balance) })}
            </Text>
          ) : null}

          {healthBurn.status === 'granted' ? (
            <Text style={styles.balanceSource}>{t('nutrition.balance.sourceHealthConnect')}</Text>
          ) : burned !== null ? (
            <Text style={styles.balanceSource}>{t('nutrition.balance.sourceEstimate')}</Text>
          ) : null}

          {healthBurn.status !== 'granted' ? (
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
                onPress={() => router.push('/(tabs)/settings' as never)}
              />
            </>
          ) : null}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('nutrition.today')}</Text>

          <View style={styles.caloriesBlock}>
            <Text style={styles.caloriesValue}>
              {totals.calories} / {goals.dailyCalories} kcal
            </Text>
            <Text style={[styles.remaining, remaining.calories < 0 ? styles.overGoal : null]}>
              {remaining.calories >= 0
                ? t('nutrition.remaining', { count: remaining.calories })
                : t('nutrition.overGoal', { count: Math.abs(remaining.calories) })}
            </Text>
          </View>

          <MacroBar
            label={t('nutrition.form.calories')}
            current={totals.calories}
            goal={goals.dailyCalories}
            unit="kcal"
            percent={progress.calories}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('nutrition.macros')}</Text>

          <View style={styles.macroBars}>
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

        <View style={styles.actions}>
          <Button
            title={t('nutrition.addMeal')}
            onPress={() => router.push('/(tabs)/nutrition/add' as never)}
          />
          <View style={styles.actionsRow}>
            <Button
              title={t('nutrition.diaryTitle')}
              variant="soft"
              compact
              style={styles.actionsRowBtn}
              onPress={() => router.push('/(tabs)/nutrition/diary' as never)}
            />
            <Button
              title={t('nutrition.historyTitle')}
              variant="soft"
              compact
              style={styles.actionsRowBtn}
              onPress={() => router.push('/(tabs)/nutrition/history' as never)}
            />
            <Button
              title={t('nutrition.goals.title')}
              variant="soft"
              compact
              style={styles.actionsRowBtn}
              onPress={() => router.push('/(tabs)/nutrition/goals' as never)}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => {
  const shadows = makeShadows(c);
  const type = makeTypeScale();
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  cardTitle: { ...type.micro, fontFamily: fonts.sansBold, color: c.textPrimary },
  balanceRow: { flexDirection: 'row', gap: spacing.sm },
  balanceCol: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  balanceValue: { fontSize: 26, fontFamily: fonts.serifBold, color: c.primary },
  balanceLabel: { ...type.micro, fontFamily: fonts.sansSemi, color: c.textSecondary },
  balanceHint: { ...type.caption, color: c.textSecondary },
  balanceSource: { ...type.micro, fontFamily: fonts.sans, color: c.textMuted },
  caloriesBlock: { gap: spacing.xxs },
  caloriesValue: { ...type.display, fontFamily: fonts.serifBold, color: c.primary },
  remaining: { ...type.subtitle, fontFamily: fonts.sansBold, color: c.textSecondary },
  overGoal: { color: c.danger },
  macroBars: { gap: spacing.sm },
  actions: { gap: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.xs },
  actionsRowBtn: { flex: 1 },
  });
};
