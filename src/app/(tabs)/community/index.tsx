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
  type CommunityFoodDatabaseEntry,
  type CommunityExercisePackEntry,
  type CommunityProgramEntry,
} from '../../../store/communityStore';
import type { ImportResult } from '../../../types';
import type { ImportFoodsResult } from '../../../store/foodStore';
import { useExerciseCatalogStore } from '../../../store/exerciseCatalogStore';

type CommunityTab = 'programs' | 'exercises' | 'foods';

function formatDays(daysCount: number) {
  return `${daysCount} jour${daysCount !== 1 ? 's' : ''}`;
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
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={2}>{entry.name}</Text>
          <Text style={styles.author}>Par {entry.author}</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{entry.level}</Text>
        </View>
      </View>

      <Text style={styles.description}>{entry.description}</Text>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={16} color={c.textSecondary} />
        <Text style={styles.metaText}>{formatDays(entry.daysCount)}</Text>
      </View>

      <Button
        title="Télécharger le programme"
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
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={2}>{entry.name}</Text>
          <Text style={styles.author}>Par {entry.author}</Text>
        </View>
        <View style={styles.retailerBadge}>
          <Text style={styles.retailerText}>{entry.retailer}</Text>
        </View>
      </View>

      <Text style={styles.description}>{entry.description}</Text>

      <View style={styles.metaWrap}>
        <View style={styles.metaRow}>
          <Ionicons name="restaurant-outline" size={16} color={c.textSecondary} />
          <Text style={styles.metaText}>
            {entry.foodsCount} aliment{entry.foodsCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color={c.textSecondary} />
          <Text style={styles.metaText}>{entry.country}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="document-outline" size={16} color={c.textSecondary} />
          <Text style={styles.metaText}>{entry.format.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={16} color={c.primary} />
        <Text style={styles.disclaimerText}>{entry.disclaimer}</Text>
      </View>

      <Button
        title="Ajouter à mes aliments"
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
  const styles = useMemo(() => makeStyles(c), [c]);
  return <View style={styles.card}>
    <View style={styles.cardHeader}><View style={styles.cardTitleBlock}><Text style={styles.cardTitle}>{entry.name}</Text><Text style={styles.author}>Par {entry.author}</Text></View><View style={styles.levelBadge}><Text style={styles.levelText}>{entry.level}</Text></View></View>
    <Text style={styles.description}>{entry.description}</Text>
    <View style={styles.metaRow}><Ionicons name="fitness-outline" size={16} color={c.textSecondary} /><Text style={styles.metaText}>{entry.exercisesCount} exercices · animations incluses</Text></View>
    <Button title={installed ? 'Mettre à jour le catalogue' : 'Télécharger les exercices'} onPress={onDownload} loading={loading} disabled={disabled} style={styles.downloadButton} />
  </View>;
}

export default function CommunityScreen() {
  const c = useColors();
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
      appAlert('Échec de l’import', result.errors.join('\n'));
    } else if (result.errors.length > 0 || result.skipped > 0) {
      appAlert(
        'Import partiel',
        `${result.importedPrograms} programme(s), ${result.importedExercises} exercice(s) importé(s).\n${result.skipped} élément(s) ignoré(s).`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Voir Programmes', onPress: goToPrograms },
        ]
      );
    } else {
      appAlert(
        'Import réussi',
        `${result.importedPrograms} programme(s) et ${result.importedExercises} exercice(s) importé(s).`,
        [
          { text: 'Rester ici', style: 'cancel' },
          { text: 'Voir Programmes', onPress: goToPrograms },
        ]
      );
    }
  };

  const showFoodImportResult = (result: ImportFoodsResult) => {
    const summary =
      `${result.added} aliment(s) ajouté(s).\n` +
      `${result.duplicateIds.length} doublon(s) ignoré(s).\n` +
      `${result.errors.length} erreur(s).`;

    appAlert(
      result.added > 0 ? 'Base d’aliments ajoutée' : 'Aucun aliment ajouté',
      summary,
      [
        { text: 'Rester ici', style: 'cancel' },
        {
          text: 'Voir Aliments',
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
        'Téléchargement impossible',
        'Impossible de télécharger ce programme. Réessayez plus tard.'
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
      appAlert('Catalogue installé', `${count} exercices sont maintenant disponibles, avec leur animation.`);
    } catch {
      appAlert('Téléchargement impossible', 'Impossible de télécharger les exercices. Réessayez plus tard.');
    } finally {
      setDownloadingId(null);
    }
  };

  const emptyTitle =
    selectedTab === 'programs'
      ? 'Aucun programme communautaire'
      : selectedTab === 'exercises' ? 'Aucun pack d’exercices' : 'Aucune base d’aliments';
  const loadingLabel =
    selectedTab === 'programs'
      ? 'Chargement des programmes...'
      : selectedTab === 'exercises' ? 'Chargement des exercices...' : 'Chargement des bases d’aliments...';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={8} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.heading}>Communauté</Text>
          <Text style={styles.headerSubtitle}>Contenus hébergés sur GitHub</Text>
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
          <Text style={[styles.tabText, selectedTab === 'programs' ? styles.tabTextActive : null]}>
            Programmes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedTab('exercises')}
          style={[styles.tab, selectedTab === 'exercises' ? styles.tabActive : null]}>
          <Ionicons name="fitness-outline" size={17} color={selectedTab === 'exercises' ? c.primaryText : c.textSecondary} />
          <Text style={[styles.tabText, selectedTab === 'exercises' ? styles.tabTextActive : null]}>Exercices</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedTab('foods')}
          style={[styles.tab, selectedTab === 'foods' ? styles.tabActive : null]}>
          <Ionicons
            name="basket-outline"
            size={17}
            color={selectedTab === 'foods' ? c.primaryText : c.textSecondary}
          />
          <Text style={[styles.tabText, selectedTab === 'foods' ? styles.tabTextActive : null]}>
            Bases d’aliments
          </Text>
        </TouchableOpacity>
      </View>

      {offline ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color={c.primary} />
          <Text style={styles.offlineText}>Hors-ligne, liste en cache.</Text>
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
              title={error ? 'Contenus indisponibles' : emptyTitle}
              subtitle={error ?? 'La liste distante est vide pour le moment.'}
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
          ListEmptyComponent={<EmptyState icon={error ? 'cloud-offline-outline' : 'fitness-outline'} title={error ? 'Contenus indisponibles' : emptyTitle} subtitle={error ?? 'La liste distante est vide pour le moment.'} />}
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
              title={error ? 'Contenus indisponibles' : emptyTitle}
              subtitle={error ?? 'La liste distante est vide pour le moment.'}
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
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 4,
    borderRadius: 13,
    backgroundColor: c.surfaceAlt,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: c.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
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
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
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
