import { useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { File as ExpoFile, Paths } from 'expo-file-system';

import { useProgramStore } from '../../../store/programStore';
import { ProgramCard } from '../../../components/programs/ProgramCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { appAlert } from '../../../components/ui/AppDialog';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  assertImportFileSize,
  assertImportTextSize,
  getImportErrorMessage,
} from '../../../lib/importLimits';

export default function ProgramsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { t } = useTranslation();
  const router = useRouter();
  const programs = useProgramStore((s) => s.programs);
  const deleteProgram = useProgramStore((s) => s.deleteProgram);

  const importPrograms = useProgramStore((s) => s.importPrograms);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleDelete = (id: string, name: string) => {
    appAlert(t('foods.deleteTitle'), t('dialog.deleteExerciseMessage', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteProgram(id) },
    ]);
  };

  const showImportResult = (result: ReturnType<typeof importPrograms>) => {
    if (result.errors.length > 0 && result.importedPrograms === 0) {
      appAlert(t('dialog.importFailed'), result.errors.join('\n'));
    } else if (result.errors.length > 0 || result.skipped > 0) {
      appAlert(
        t('dialog.importPartial'),
        t('dialog.importPartialSummary', {
          programs: result.importedPrograms,
          exercises: result.importedExercises,
          skipped: result.skipped,
        })
      );
    } else {
      appAlert(
        t('dialog.importSuccess'),
        t('dialog.importSummary', {
          programs: result.importedPrograms,
          exercises: result.importedExercises,
        })
      );
    }
  };

  const confirmAndImport = (content: string) => {
    const preview = importPrograms(content, { commit: false });
    if (preview.errors.length > 0 && preview.importedPrograms === 0) {
      showImportResult(preview);
      return;
    }

    if (preview.unknownExercises.length > 0) {
      const list = preview.unknownExercises.slice(0, 8).join('\n');
      const remaining = preview.unknownExercises.length > 8
        ? `\n${t('dialog.andOthers', { count: preview.unknownExercises.length - 8 })}`
        : '';
      appAlert(
        t('dialog.unknownExercises'),
        t('dialog.unknownExercisesMessage', {
          count: preview.unknownExercises.length,
          list,
          remaining,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: () => showImportResult(importPrograms(content)),
          },
        ]
      );
      return;
    }

    showImportResult(importPrograms(content));
  };

  const handleImport = async () => {
    try {
      setImporting(true);

      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        const file = await new Promise<globalThis.File | null>((resolve) => {
          input.onchange = () => resolve(input.files?.[0] ?? null);
          input.click();
        });
        if (!file) return;

        assertImportFileSize(file.size);
        const text = await file.text();
        assertImportTextSize(text);
        confirmAndImport(text);
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      assertImportFileSize(asset.size);
      const content = await FileSystemLegacy.readAsStringAsync(asset.uri);
      assertImportTextSize(content);
      confirmAndImport(content);
    } catch (error) {
      appAlert(
        t('common.error'),
        getImportErrorMessage(error, t('dialog.importReadError'))
      );
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const content = JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), programs },
        null,
        2
      );
      const filename = `sport-tracker-programmes-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        appAlert(t('dialog.exportReady'), t('dialog.exportReadyMessage', { count: programs.length }));
        return;
      }

      const file = new ExpoFile(Paths.document, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(content);
      appAlert(t('dialog.exportReady'), t('dialog.fileCreated', { uri: file.uri }));
    } catch {
      appAlert(t('common.error'), t('dialog.exportError'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.wrapper}>
        <View style={styles.importExportRow}>
          <Button
            title={t('settings.importProgram')}
            onPress={handleImport}
            loading={importing}
            style={styles.halfBtn}
          />
          <Button
            title={t('settings.exportPrograms')}
            variant="secondary"
            onPress={handleExport}
            loading={exporting}
            disabled={programs.length === 0}
            style={styles.halfBtn}
          />
        </View>
        <FlatList
        data={programs}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            onPress={() => router.push(`/(tabs)/programs/${item.id}`)}
            onDelete={() => handleDelete(item.id, item.name)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="barbell-outline"
            title={t('community.noPrograms')}
            subtitle={t('community.emptyList')}
          />
        }
        contentContainerStyle={programs.length === 0 ? styles.emptyContainer : styles.list}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  wrapper: { flex: 1 },
  importExportRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  halfBtn: { flex: 1 },
  list: { paddingBottom: 20 },
  emptyContainer: { flex: 1 },
});
