import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SegmentedTabs } from '../ui/SegmentedTabs';
import { EmptyState } from '../ui/EmptyState';
import { useTranslation } from '../../i18n/useTranslation';
import { useColors } from '../../theme/useColors';
import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import {
  aggregateHistory,
  type DailyHistoryEntry,
  type HistoryBucket,
  type HistoryGranularity,
} from '../../lib/energyHistory';
import type { HealthHistoryStatus } from '../../hooks/useEnergyHistory';

export type HistoryMetric = 'energy' | 'steps';

interface EnergyHistoryListProps {
  metric: HistoryMetric;
  daily: DailyHistoryEntry[];
  healthStatus: HealthHistoryStatus;
}

/** Libelle d'un compartiment : « lun. 22 sept. », « septembre 2026 », « 2026 ». */
function bucketLabel(key: string, granularity: HistoryGranularity, locale: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (granularity === 'day') {
    return new Date(y, m - 1, d).toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }
  if (granularity === 'month') {
    return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }
  return key;
}

/**
 * Historique par jour, mois ou annee : depense par source (A01) ou pas et
 * calories associees (A02). Toute la logique vit dans `lib/energyHistory` ;
 * ce composant ne fait que la presenter.
 */
export function EnergyHistoryList({ metric, daily, healthStatus }: EnergyHistoryListProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [granularity, setGranularity] = useState<HistoryGranularity>('day');

  const buckets = useMemo(() => {
    const all = aggregateHistory(daily, granularity);
    // Vue « pas » : un compartiment sans aucun pas n'a rien a montrer.
    return metric === 'steps' ? all.filter((b) => b.daysWithSteps > 0) : all.filter((b) => b.daysWithTotal > 0);
  }, [daily, granularity, metric]);

  const n = (value: number) => Math.round(value).toLocaleString(locale);

  const tabs = (
    <SegmentedTabs
      testID="history-granularity"
      value={granularity}
      onChange={setGranularity}
      options={[
        { value: 'day', label: t('history.granularity.day') },
        { value: 'month', label: t('history.granularity.month') },
        { value: 'year', label: t('history.granularity.year') },
      ]}
    />
  );

  if (buckets.length === 0) {
    return metric === 'energy' ? (
      <View style={styles.fill}>
        {tabs}
        <EmptyState
          icon="flame-outline"
          title={t('history.energy.emptyTitle')}
          subtitle={t('history.energy.emptySubtitle')}
          actionLabel={t('history.energy.profileCta')}
          onAction={() => router.push('/(tabs)/profile' as never)}
        />
      </View>
    ) : (
      <View style={styles.fill}>
        {tabs}
        <EmptyState
          icon="footsteps-outline"
          title={t('history.steps.emptyTitle')}
          subtitle={t('history.steps.emptySubtitle')}
          actionLabel={t('history.steps.connectCta')}
          onAction={() => router.push('/(tabs)/nutrition' as never)}
        />
      </View>
    );
  }

  const renderEnergy = (b: HistoryBucket) => {
    const parts = [
      { key: 'body', kcal: b.bodyKcal, color: c.textMuted, label: t('history.energy.body') },
      { key: 'measured', kcal: b.measuredKcal, color: c.primary, label: t('history.energy.measured') },
      { key: 'steps', kcal: b.stepsKcal, color: c.secondary, label: t('history.energy.steps') },
      { key: 'sessions', kcal: b.sessionsKcal, color: c.tertiary, label: t('history.energy.sessions') },
    ].filter((p) => p.kcal > 0);

    return (
      <View style={styles.row} testID="energy-row">
        <View style={styles.rowHead}>
          <Text style={styles.rowTitle}>{bucketLabel(b.key, granularity, locale)}</Text>
          <Text style={styles.rowValue}>{n(b.totalKcal)} kcal</Text>
        </View>
        {/* Barre empilee : la COULEUR n'est jamais la seule information, le
            detail textuel juste en dessous reprend chaque source. */}
        <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {parts.map((p) => (
            <View key={p.key} style={{ flex: p.kcal, backgroundColor: p.color }} />
          ))}
        </View>
        <Text style={styles.rowDetail}>
          {parts.map((p) => `${p.label} ${n(p.kcal)}`).join('  ·  ')}
        </Text>
        {b.sessionsWithinMeasuredKcal > 0 ? (
          <Text style={styles.rowNote}>
            {t('history.energy.withinMeasured', { kcal: n(b.sessionsWithinMeasuredKcal) })}
          </Text>
        ) : null}
        {b.daysWithoutActivity > 0 ? (
          <Text style={styles.rowNote}>
            {t('history.energy.daysWithoutActivity', { count: b.daysWithoutActivity })}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderSteps = (b: HistoryBucket) => (
    <View style={styles.row} testID="steps-row">
      <View style={styles.rowHead}>
        <Text style={styles.rowTitle}>{bucketLabel(b.key, granularity, locale)}</Text>
        <Text style={styles.rowValue}>{t('history.steps.count', { steps: n(b.steps) })}</Text>
      </View>
      <Text style={styles.rowDetail}>{t('history.steps.kcal', { kcal: n(b.stepsRelatedKcal) })}</Text>
      {granularity !== 'day' && b.daysWithSteps > 0 ? (
        <Text style={styles.rowNote}>
          {t('history.steps.average', { steps: n(b.steps / b.daysWithSteps) })}
        </Text>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={buckets}
      keyExtractor={(b) => b.key}
      ListHeaderComponent={tabs}
      renderItem={({ item }) => (metric === 'energy' ? renderEnergy(item) : renderSteps(item))}
      ListFooterComponent={
        metric === 'steps' && healthStatus === 'granted' ? (
          <Text style={styles.footer}>{t('history.steps.depthHint')}</Text>
        ) : null
      }
      contentContainerStyle={styles.list}
    />
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    list: { paddingBottom: 20 },
    row: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    rowTitle: {
      flex: 1,
      fontFamily: fonts.serifBold,
      fontSize: 15,
      lineHeight: 19,
      color: c.textPrimary,
    },
    rowValue: {
      fontFamily: fonts.serifBold,
      fontSize: 15,
      lineHeight: 19,
      color: c.textPrimary,
    },
    bar: {
      flexDirection: 'row',
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: c.surfaceAlt,
    },
    rowDetail: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: c.textSecondary,
    },
    rowNote: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 15,
      color: c.textMuted,
    },
    footer: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 15,
      color: c.textMuted,
      paddingHorizontal: 20,
      paddingTop: 14,
      textAlign: 'center',
    },
  });
