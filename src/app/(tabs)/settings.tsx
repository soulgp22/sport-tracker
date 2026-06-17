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
import * as FileSystem from 'expo-file-system';

import { Button } from '../../components/ui/Button';
import { useProgramStore } from '../../store/programStore';
import { useSessionStore } from '../../store/sessionStore';

export default function SettingsScreen() {
  const importPrograms = useProgramStore((s) => s.importPrograms);
  const deleteAllPrograms = useProgramStore((s) => s.programs.length > 0);
  const programsCount = useProgramStore((s) => s.programs.length);
  const sessionsCount = useSessionStore((s) => s.sessions.length);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    try {
      setImporting(true);

      if (Platform.OS === 'web') {
        // Web fallback: file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        const file = await new Promise<File | null>((resolve) => {
          input.onchange = () => resolve(input.files?.[0] ?? null);
          input.click();
        });
        if (!file) return;

        const text = await file.text();
        const result = importPrograms(text);
        showImportResult(result.success, result.errors);
        return;
      }

      // Mobile: expo-document-picker
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri);
      const importResult = importPrograms(content);
      showImportResult(importResult.success, importResult.errors);
    } catch (err) {
      Alert.alert('Erreur', "Impossible de lire le fichier. Vérifiez qu'il s'agit d'un fichier JSON valide.");
    } finally {
      setImporting(false);
    }
  };

  const showImportResult = (success: number, errors: string[]) => {
    if (errors.length > 0 && success === 0) {
      Alert.alert('Échec de l\'import', errors.join('\n'));
    } else if (errors.length > 0) {
      Alert.alert(
        'Import partiel',
        `${success} programme(s) importé(s).\n${errors.length} erreur(s) :\n${errors.join('\n')}`
      );
    } else {
      Alert.alert('Import réussi', `${success} programme(s) importé(s) avec succès !`);
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Paramètres</Text>
      </View>

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
            Importez un fichier JSON contenant un tableau de programmes. Exemple :
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
                              exerciseName: 'Bench Press',
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { fontSize: 28, fontWeight: '700', color: '#111827' },
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
