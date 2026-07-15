import { useMemo } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { useCommunityStore, type CommunityProgramEntry } from '../../../store/communityStore';
import type { ImportResult } from '../../../types';

function formatDays(daysCount: number) {
  return `${daysCount} jour${daysCount !== 1 ? 's' : ''}`;
}

function CommunityCard({
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
          <Text style={styles.cardTitle} numberOfLines={2}>
            {entry.name}
          </Text>
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
        title="Télécharger"
        onPress={onDownload}
        loading={loading}
        disabled={disabled}
        style={styles.downloadButton}
      />
    </View>
  );
}

export default function CommunityScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const data = useCommunityStore((s) => s.data);
  const loading = useCommunityStore((s) => s.loading);
  const error = useCommunityStore((s) => s.error);
  const offline = useCommunityStore((s) => s.offline);
  const fetchManifest = useCommunityStore((s) => s.fetchManifest);
  const downloadProgram = useCommunityStore((s) => s.downloadProgram);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const programs = data?.programs ?? [];

  useEffect(() => {
    void fetchManifest();
  }, [fetchManifest]);

  const goToPrograms = () => router.push('/(tabs)/programs' as never);

  const showImportResult = (result: ImportResult) => {
    if (result.errors.length > 0 && result.importedPrograms === 0) {
      Alert.alert('Échec de l\'import', result.errors.join('\n'));
    } else if (result.errors.length > 0 || result.skipped > 0) {
      Alert.alert(
        'Import partiel',
        `${result.importedPrograms} programme(s), ${result.importedExercises} exercice(s) importé(s).\n${result.skipped} élément(s) ignoré(s).`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Voir Programmes', onPress: goToPrograms },
        ]
      );
    } else {
      Alert.alert(
        'Import réussi',
        `${result.importedPrograms} programme(s) et ${result.importedExercises} exercice(s) importé(s).`,
        [
          { text: 'Rester ici', style: 'cancel' },
          { text: 'Voir Programmes', onPress: goToPrograms },
        ]
      );
    }
  };

  const handleDownload = async (entry: CommunityProgramEntry) => {
    try {
      setDownloadingId(entry.id);
      const result = await downloadProgram(entry);
      showImportResult(result);
    } catch {
      Alert.alert('Téléchargement impossible', 'Impossible de télécharger ce programme. Réessayez plus tard.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading && programs.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={styles.centerText}>Chargement des programmes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (programs.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={error ? 'cloud-offline-outline' : 'cloud-download-outline'}
            title={error ? 'Programmes indisponibles' : 'Aucun programme communautaire'}
            subtitle={error ?? 'La liste distante est vide pour le moment.'}
          />
          {error ? (
            <View style={styles.retryContainer}>
              <Button title="Réessayer" variant="secondary" onPress={() => void fetchManifest()} />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={programs}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => (
          <CommunityCard
            entry={item}
            loading={downloadingId === item.id}
            disabled={!!downloadingId && downloadingId !== item.id}
            onDownload={() => void handleDownload(item)}
          />
        )}
        refreshing={loading}
        onRefresh={() => void fetchManifest()}
        ListHeaderComponent={
          offline ? (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={18} color={c.primary} />
              <Text style={styles.offlineText}>Hors-ligne, liste en cache.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  list: { paddingVertical: 10, paddingBottom: 28 },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  centerText: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
  emptyContainer: { flex: 1 },
  retryContainer: { paddingHorizontal: 16, paddingBottom: 24 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: c.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  offlineText: { flex: 1, fontSize: 13, fontWeight: '600', color: c.textPrimary },
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 12,
    shadowColor: c.overlay,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTitleBlock: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  author: { fontSize: 13, color: c.textSecondary },
  levelBadge: {
    maxWidth: 132,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: c.accentSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  levelText: { fontSize: 12, fontWeight: '700', color: c.primary, textAlign: 'center' },
  description: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
  downloadButton: { marginTop: 2 },
});
