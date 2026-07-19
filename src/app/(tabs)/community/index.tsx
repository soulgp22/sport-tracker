import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { appAlert } from '../../../components/ui/AppDialog';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import {
  useCommunityStore,
  resolveEntryName,
  resolveEntryDescription,
  resolveEntryGoal,
  resolveEntryLevel,
  resolveEquipmentLabels,
  type CommunityFoodDatabaseEntry,
  type CommunityExercisePackEntry,
  type CommunityProgramEntry,
} from '../../../store/communityStore';
import type { ImportResult } from '../../../types';
import type { ImportFoodsResult } from '../../../store/foodStore';
import { useExerciseCatalogStore } from '../../../store/exerciseCatalogStore';
import { useTranslation } from '../../../i18n/useTranslation';


type CommunityTab = 'programs' | 'exercises' | 'foods';

function formatDays(daysCount: number, t: (key: string, vars?: Record<string, string | number>) => string) {
  return t('community.days', { count: daysCount });
}

function formatRetailers(entry: CommunityFoodDatabaseEntry) {
  return entry.retailers?.join(', ') ?? entry.retailer ?? entry.name;
}

function CommunityProgramCard({
  entry,
  disabled,
  loading,
  onDownload,
}: {
  entry: CommunityProgramEntry;
  disabled: boolean;
  loading: boolean;
  onDownload: () => void;
}) {
  const c = useColors();
  const { t, language } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const resolvedName = resolveEntryName(entry, language);
  const resolvedGoal = resolveEntryGoal(entry, language);
  const equipmentLabels = resolveEquipmentLabels(entry.equipmentProfileIds, language);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={2}>{resolvedName}</Text>
          <Text style={styles.author}>{t('community.by')} {entry.author}</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{resolveEntryLevel(entry.level, language)}</Text>
        </View>
      </View>

      <Text style={styles.description}>{resolveEntryDescription(entry, language)}</Text>

      <View style={styles.programMeta}>
        {resolvedGoal ? (
          <View style={styles.metaRow}>
            <Ionicons name="flag-outline" size={16} color={c.textSecondary} />
            <Text style={styles.metaText}>{resolvedGoal}</Text>
          </View>
        ) : null}
        {equipmentLabels.length > 0 ? (
          <View style={styles.metaRow}>
            <Ionicons name="barbell-outline" size={16} color={c.textSecondary} />
            <Text style={styles.metaText}>{equipmentLabels.join(', ')}</Text>
          </View>
        ) : entry.equipment ? (
          <View style={styles.metaRow}>
            <Ionicons name="barbell-outline" size={16} color={c.textSecondary} />
            <Text style={styles.metaText}>{entry.equipment}</Text>
          </View>
        ) : null}
        <View style={styles.metaWrap}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={c.textSecondary} />
            <Text style={styles.metaText}>{formatDays(entry.daysCount, t)}</Text>
          </View>
          {entry.sessionsPerWeek ? (
            <View style={styles.metaRow}>
              <Ionicons name="repeat-outline" size={16} color={c.textSecondary} />
              <Text style={styles.metaText}>{t('community.sessionsPerWeek', { count: entry.sessionsPerWeek })}</Text>
            </View>
          ) : null}
          {entry.sessionMinutes ? (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={c.textSecondary} />
              <Text style={styles.metaText}>≈ {entry.sessionMinutes} min</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Button
        title={t('community.downloadProgram')}
        onPress={onDownload}
        loading={loading}
        disabled={disabled}
        style={styles.downloadButton}
      />
    </View>
  );
}

function CommunityFoodCard({
  entry,
  disabled,
  loading,
  onDownload,
}: {
  entry: CommunityFoodDatabaseEntry;
  disabled: boolean;
  loading: boolean;
  onDownload: () => void;
}) {
  const c = useColors();
  const { language, t } =  useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={2}>{resolveEntryName(entry, language)}</Text>
          <Text style={styles.author}>{t('community.by')} {entry.author}</Text>
        </View>
        <View style={styles.retailerBadge}>
          <Text style={styles.retailerText}>{entry.country ?? entry.retailer ?? entry.name}</Text>
        </View>
      </View>

      <Text style={styles.description}>{resolveEntryDescription(entry, language)}</Text>

      <View style={styles.metaWrap}>
        <View style={styles.metaRow}>
          <Ionicons name="restaurant-outline" size={16} color={c.textSecondary} />
          <Text style={styles.metaText}>
            {t('community.foodsCount', { count: entry.foodsCount })}{entry.foodsCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {entry.country ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={c.textSecondary} />
            <Text style={styles.metaText}>{entry.country}</Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="storefront-outline" size={16} color={c.textSecondary} />
          <Text style={styles.metaText}>{t('community.retailers')} : {formatRetailers(entry)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="document-outline" size={16} color={c.textSecondary} />
          <Text style={styles.metaText}>
            {entry.format.toUpperCase()} · {t('community.source')} : {entry.license ?? 'GitHub'}
          </Text>
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={16} color={c.primary} />
        <Text style={styles.disclaimerText}>{entry.disclaimer}</Text>
      </View>

      <Button
        title={t('community.addToMyFoods')}
        onPress={onDownload}
        loading={loading}
        disabled={disabled}
        style={styles.downloadButton}
      />
    </View>
  );
}

function CommunityExerciseCard({ entry, disabled, loading, installed, onDownload }: {
  entry: CommunityExercisePackEntry;
  disabled: boolean;
  loading: boolean;
  installed: boolean;
  onDownload: () => void;
}) {
  const c = useColors();
  const { language, t } =  useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  return <View style={styles.card}>
    <View style={styles.cardHeader}><View style={styles.cardTitleBlock}><Text style={styles.cardTitle}>{resolveEntryName(entry, language)}</Text><Text style={styles.author}>{t('community.by')} {entry.author}</Text></View><View style={styles.levelBadge}><Text style={styles.levelText}>{entry.level}</Text></View></View>
    <Text style={styles.description}>{resolveEntryDescription(entry, language)}</Text>
    <View style={styles.metaRow}><Ionicons name="fitness-outline" size={16} color={c.textSecondary} /><Text style={styles.metaText}>{t('community.exercisesCount', { count: entry.exercisesCount })}</Text></View>
    <Button title={installed ? t('community.updateCatalog') : t('community.downloadExercises')} onPress={onDownload} loading={loading} disabled={disabled} style={styles.downloadButton} />
  </View>;
}

export default function CommunityScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const data = useCommunityStore((s) => s.data);
  const loading = useCommunityStore((s) => s.loading);
  const error = useCommunityStore((s) => s.error);
  const offline = useCommunityStore((s) => s.offline);
  const fetchManifest = useCommunityStore((s) => s.fetchManifest);
  const downloadProgram = useCommunityStore((s) => s.downloadProgram);
  const downloadFoodDatabase = useCommunityStore((s) => s.downloadFoodDatabase);
  const downloadExercisePack = useCommunityStore((s) => s.downloadExercisePack);
  const installedPackIds = useExerciseCatalogStore((s) => s.installedPackIds);
  const [selectedTab, setSelectedTab] = useState<CommunityTab>(
    params.tab === 'foods' ? 'foods' : params.tab === 'exercises' ? 'exercises' : 'programs'
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const programs = data?.programs ?? [];
  const foodDatabases = data?.foodDatabases ?? [];
  const exercisePacks = data?.exercisePacks ?? [];
  const currentItems = selectedTab === 'programs' ? programs : selectedTab === 'exercises' ? exercisePacks : foodDatabases;

  useEffect(() => {
    void fetchManifest();
  }, [fetchManifest]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as never);
    }
  };

  const showProgramImportResult = (result: ImportResult) => {
    const goToPrograms = () => router.push('/(tabs)/programs' as never);

    if (result.errors.length > 0 && result.importedPrograms === 0) {
      appAlert(t('community.importFailed'), result.errors.join('\n'));
    } else if (result.errors.length > 0 || result.skipped > 0) {
      appAlert(
        t('community.importPartial'),
        t('community.importPartialMsg', { programs: result.importedPrograms, exercises: result.importedExercises, skipped: result.skipped }),
        [
          { text: 'OK', style: 'cancel' },
          { text: t('community.seePrograms'), onPress: goToPrograms },
        ]
      );
    } else {
      appAlert(
        t('community.importSuccess'),
        t('community.importSuccessMsg', { programs: result.importedPrograms, exercises: result.importedExercises }),
        [
          { text: t('community.stayHere'), style: 'cancel' },
          { text: t('community.seePrograms'), onPress: goToPrograms },
        ]
      );
    }
  };

  const showFoodImportResult = (result: ImportFoodsResult) => {
    const summary = t('community.foodImportSummary', { added: result.added, duplicates: result.duplicateIds.length, errors: result.errors.length });

    appAlert(
      result.added > 0 ? 'Base d’aliments ajoutée' : 'Aucun aliment ajouté',
      summary,
      [
        { text: t('community.stayHere'), style: 'cancel' },
        {
          text: t('community.seeFoods'),
          onPress: () => router.push('/(tabs)/foods' as never),
        },
      ]
    );
  };

  const handleProgramDownload = async (entry: CommunityProgramEntry) => {
    try {
      setDownloadingId(entry.id);
      showProgramImportResult(await downloadProgram(entry));
    } catch {
      appAlert(
        t('community.downloadFailed'),
        t('community.programDownloadFailed')
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFoodDownload = async (entry: CommunityFoodDatabaseEntry) => {
    try {
      setDownloadingId(entry.id);
      showFoodImportResult(await downloadFoodDatabase(entry));
    } catch {
      appAlert(
        'Téléchargement impossible',
        'Impossible de télécharger cette base d’aliments. Réessayez plus tard.'
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExerciseDownload = async (entry: CommunityExercisePackEntry) => {
    try {
      setDownloadingId(entry.id);
      const count = await downloadExercisePack(entry);
      appAlert(t('community.catalogInstalled'), `${count} `);
    } catch {
      appAlert(t('community.downloadFailed'), t('community.exerciseDownloadFailed'));
    } finally {
      setDownloadingId(null);
    }
  };

  const emptyTitle =
    selectedTab === 'programs'
      ? t('community.noPrograms')
      : selectedTab === 'exercises' ? t('community.noExercises') : t('community.noFoods');
  const loadingLabel =
    selectedTab === 'programs'
      ? t('community.loadingPrograms')
      : selectedTab === 'exercises' ? t('community.loadingExercises') : t('community.loadingFoods');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={8} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.heading}>{t('community.heading')}</Text>
          <Text style={styles.headerSubtitle}>{t('community.subtitle')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => void fetchManifest()}
          hitSlop={8}
          style={styles.headerButton}
          disabled={loading}>
          <Ionicons name="refresh" size={22} color={loading ? c.textMuted : c.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setSelectedTab('programs')}
          style={[styles.tab, selectedTab === 'programs' ? styles.tabActive : null]}>
          <Ionicons
            name="barbell-outline"
            size={17}
            color={selectedTab === 'programs' ? c.primaryText : c.textSecondary}
          />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={[styles.tabText, selectedTab === 'programs' ? styles.tabTextActive : null]}>
            {t('community.tabs.programs')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedTab('exercises')}
          style={[styles.tab, selectedTab === 'exercises' ? styles.tabActive : null]}>
          <Ionicons name="fitness-outline" size={17} color={selectedTab === 'exercises' ? c.primaryText : c.textSecondary} />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={[styles.tabText, selectedTab === 'exercises' ? styles.tabTextActive : null]}>{t('community.tabs.exercises')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedTab('foods')}
          style={[styles.tab, selectedTab === 'foods' ? styles.tabActive : null]}>
          <Ionicons
            name="basket-outline"
            size={17}
            color={selectedTab === 'foods' ? c.primaryText : c.textSecondary}
          />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={[styles.tabText, selectedTab === 'foods' ? styles.tabTextActive : null]}>
            {t('community.tabs.foods')}
          </Text>
        </TouchableOpacity>
      </View>

      {offline ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color={c.primary} />
          <Text style={styles.offlineText}>{t('community.offlineBanner')}</Text>
        </View>
      ) : null}

      {loading && currentItems.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={styles.centerText}>{loadingLabel}</Text>
        </View>
      ) : selectedTab === 'programs' ? (
        <FlatList
          data={programs}
          key="programs"
          keyExtractor={(entry) => entry.id}
          renderItem={({ item }) => (
            <CommunityProgramCard
              entry={item}
              loading={downloadingId === item.id}
              disabled={!!downloadingId && downloadingId !== item.id}
              onDownload={() => void handleProgramDownload(item)}
            />
          )}
          refreshing={loading}
          onRefresh={() => void fetchManifest()}
          ListEmptyComponent={
            <EmptyState
              icon={error ? 'cloud-offline-outline' : 'cloud-download-outline'}
              title={error ? t('community.unavailable') : emptyTitle}
              subtitle={error ? t(error) : t('community.emptyList')}
            />
          }
          contentContainerStyle={programs.length > 0 ? styles.list : styles.emptyList}
        />
      ) : selectedTab === 'exercises' ? (
        <FlatList
          data={exercisePacks}
          key="exercises"
          keyExtractor={(entry) => entry.id}
          renderItem={({ item }) => <CommunityExerciseCard entry={item} loading={downloadingId === item.id} disabled={!!downloadingId && downloadingId !== item.id} installed={installedPackIds.includes(item.id)} onDownload={() => void handleExerciseDownload(item)} />}
          refreshing={loading}
          onRefresh={() => void fetchManifest()}
          ListEmptyComponent={<EmptyState icon={error ? 'cloud-offline-outline' : 'fitness-outline'} title={error ? t('community.unavailable') : emptyTitle} subtitle={error ? t(error) : t('community.emptyList')} />}
          contentContainerStyle={exercisePacks.length > 0 ? styles.list : styles.emptyList}
        />
      ) : (
        <FlatList
          data={foodDatabases}
          key="foods"
          keyExtractor={(entry) => entry.id}
          renderItem={({ item }) => (
            <CommunityFoodCard
              entry={item}
              loading={downloadingId === item.id}
              disabled={!!downloadingId && downloadingId !== item.id}
              onDownload={() => void handleFoodDownload(item)}
            />
          )}
          refreshing={loading}
          onRefresh={() => void fetchManifest()}
          ListEmptyComponent={
            <EmptyState
              icon={error ? 'cloud-offline-outline' : 'basket-outline'}
              title={error ? t('community.unavailable') : emptyTitle}
              subtitle={error ? t(error) : t('community.emptyList')}
            />
          }
          contentContainerStyle={foodDatabases.length > 0 ? styles.list : styles.emptyList}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  heading: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
  headerSubtitle: { fontSize: 11, color: c.textSecondary },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 4,
    borderRadius: 13,
    backgroundColor: c.surfaceAlt,
  },
  tab: {
    flex: 1,
    minWidth: 70,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: c.primary },
  tabText: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: c.textSecondary },
  tabTextActive: { color: c.primaryText },
  list: { paddingVertical: 4, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  centerText: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: c.surfaceAlt,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: c.border,
  },
  offlineText: { flex: 1, fontSize: 13, fontWeight: '600', color: c.textPrimary },
  card: {
    backgroundColor: c.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.border,
    padding: 15,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 11,
    shadowColor: c.overlay,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTitleBlock: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
  author: { fontSize: 12, color: c.textSecondary },
  levelBadge: {
    maxWidth: 132,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: c.accentSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  levelText: { fontSize: 11, fontWeight: '700', color: c.primary, textAlign: 'center' },
  retailerBadge: {
    maxWidth: 120,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: c.primary,
    borderRadius: 8,
  },
  retailerText: { fontSize: 11, fontWeight: '800', color: c.primaryText },
  description: { fontSize: 14, lineHeight: 19, color: c.textSecondary },
  programMeta: { gap: 8 },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: c.textSecondary },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 9,
    borderRadius: 9,
    backgroundColor: c.accentSoft,
  },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 15, color: c.textSecondary },
  downloadButton: { marginTop: 1 },
});
