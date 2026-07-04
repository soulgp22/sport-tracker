import { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { File as ExpoFile, Paths } from 'expo-file-system';

import { Button } from '../../components/ui/Button';
import { useProgramStore } from '../../store/programStore';
import { useSessionStore } from '../../store/sessionStore';

export default function SettingsScreen() {
  const importPrograms = useProgramStore((s) => s.importPrograms);
  const programs = useProgramStore((s) => s.programs);
  const programsCount = useProgramStore((s) => s.programs.length);
  const sessionsCount = useSessionStore((s) => s.sessions.length);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const showImportResult = (result: ReturnType<typeof importPrograms>) => {
    if (result.errors.length > 0 && result.importedPrograms === 0) {
      Alert.alert('Échec de l\'import', result.errors.join('\n'));
    } else if (result.errors.length > 0 || result.skipped > 0) {
      Alert.alert(
        'Import partiel',
        `${result.importedPrograms} programme(s), ${result.importedExercises} exercice(s) importé(s).\n${result.skipped} élément(s) ignoré(s).`
      );
    } else {
      Alert.alert(
        'Import réussi',
        `${result.importedPrograms} programme(s) et ${result.importedExercises} exercice(s) importé(s).`
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
        ? `\n… et ${preview.unknownExercises.length - 8} autre(s)`
        : '';
      Alert.alert(
        'Exercices inconnus',
        `Le fichier contient ${preview.unknownExercises.length} exercice(s) inconnu(s).\n\n${list}${remaining}\n\nImporter seulement les exercices reconnus et ignorer le reste ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
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
        // Web fallback: file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        const file = await new Promise<globalThis.File | null>((resolve) => {
          input.onchange = () => resolve(input.files?.[0] ?? null);
          input.click();
        });
        if (!file) return;

        const text = await file.text();
        confirmAndImport(text);
        return;
      }

      // Mobile: expo-document-picker
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const content = await FileSystemLegacy.readAsStringAsync(asset.uri);
      confirmAndImport(content);
    } catch {
      Alert.alert('Erreur', "Impossible de lire le fichier. Vérifiez qu'il s'agit d'un fichier JSON valide.");
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const content = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), programs }, null, 2);
      const filename = `sport-tracker-programmes-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        Alert.alert('Export prêt', `${programs.length} programme(s) exporté(s).`);
        return;
      }

      const file = new ExpoFile(Paths.document, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(content);
      Alert.alert('Export prêt', `Fichier créé : ${file.uri}`);
    } catch {
      Alert.alert('Erreur', "Impossible d'exporter les programmes.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Tout supprimer',
      'Supprimer tous les programmes et tout l\'historique des séances ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: () => {
            useProgramStore.getState().programs.forEach((p) =>
              useProgramStore.getState().deleteProgram(p.id)
            );
            useSessionStore.getState().sessions.forEach((s) =>
              useSessionStore.getState().deleteSession(s.id)
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Programmes</Text>

          <Button
            title="Importer un programme"
            onPress={handleImport}
            loading={importing}
            style={styles.actionBtn}
          />

          <Button
            title="Exporter les programmes"
            variant="secondary"
            onPress={handleExport}
            loading={exporting}
            disabled={programsCount === 0}
            style={styles.actionBtn}
          />

          <Button
            title={`Tout supprimer (${programsCount} prog., ${sessionsCount} séances)`}
            variant="danger"
            onPress={handleDeleteAll}
            disabled={programsCount === 0 && sessionsCount === 0}
            style={styles.actionBtn}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Format d&apos;import</Text>
          <Text style={styles.helpText}>
            Importez un fichier JSON exporté par l&apos;app. Les exercices absents du catalogue sont ignorés après confirmation. Exemple :
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>
              {JSON.stringify(
                {
                  version: 1,
                  programs: [
                    {
                      name: 'PPL',
                      days: [
                        {
                          name: 'Push',
                          exercises: [
                            {
                              exerciseId: 'offline-001',
                              exerciseName: 'Barbell Bench Press',
                              sets: [{ reps: 10, weight: 60, restSeconds: 90 }],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                null,
                2
              )}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <Text style={styles.aboutText}>Sport Tracker v1.0.0</Text>
          <Text style={styles.aboutSubtext}>
            Application de suivi d&apos;entraînement personnel
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 32, paddingBottom: 40 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  actionBtn: { marginTop: 4 },
  helpText: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  codeBlock: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  code: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#374151' },
  aboutText: { fontSize: 15, fontWeight: '500', color: '#374151' },
  aboutSubtext: { fontSize: 13, color: '#6b7280' },
});
