import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { File as ExpoFile, Paths } from 'expo-file-system';

import { Button } from '../../components/ui/Button';
import { colors } from '../../constants/colors';
import { useExerciseCatalogStore } from '../../store/exerciseCatalogStore';
import { useProgramStore } from '../../store/programStore';
import { useSessionStore } from '../../store/sessionStore';

function getAuthorizedExerciseNames() {
  const namesByKey = new Map<string, string>();

  useExerciseCatalogStore.getState().all().forEach((exercise) => {
    const displayName = (exercise.nameFr ?? exercise.name).trim();
    if (!displayName) return;

    namesByKey.set(displayName.toLocaleLowerCase('fr-FR'), displayName);
  });

  return [...namesByKey.values()].sort((a, b) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  );
}

function buildAiProgramPrompt() {
  const fixedPromptLines = [
    'Génère-moi un programme de musculation au format JSON EXACT ci-dessous, importable dans mon application.',
    '',
    'FORMAT (respecte-le à la lettre, réponds UNIQUEMENT le JSON, sans texte autour) :',
    '{',
    '  "version": 1,',
    '  "programs": [',
    '    {',
    '      "name": "Nom du programme",',
    '      "days": [',
    '        {',
    '          "name": "Nom de la séance (ex: Push, Jour 1)",',
    '          "exercises": [',
    '            {',
    '              "exerciseName": "<nom EXACT de la liste autorisée ci-dessous>",',
    '              "sets": [',
    '                { "reps": 10, "weight": 0, "restSeconds": 90 }',
    '              ],',
    '              "alternativeExerciseNames": ["<nom exact optionnel>"]',
    '            }',
    '          ]',
    '        }',
    '      ]',
    '    }',
    '  ]',
    '}',
    '',
    'RÈGLES :',
    '- "exerciseName" et chaque "alternativeExerciseNames" DOIVENT être un nom EXACT de la liste autorisée ci-dessous (tout nom hors liste est ignoré à l\'import).',
    '- "reps" = répétitions, "weight" = charge en kg (mets 0 si à définir), "restSeconds" = temps de repos en secondes.',
    '- Mets autant d\'objets dans "sets" qu\'il y a de séries.',
    '- "alternativeExerciseNames" est optionnel (exercices de repli si le matériel est occupé).',
    '- N\'invente AUCUN exercice hors de la liste.',
    '',
    'EXERCICES AUTORISÉS :',
  ];
  const exerciseLines = getAuthorizedExerciseNames().map((name) => `- ${name}`);

  return [...fixedPromptLines, ...exerciseLines].join('\n');
}

// Calcul paresseux + mis en cache : construire le prompt parcourt tout le
// catalogue et fait des opérations Intl coûteuses (lentes sur Hermes). On évite
// de le faire au montage de l'écran ; il n'est calculé qu'au 1er appui sur
// « Copier », puis réutilisé depuis le cache.
let cachedAiProgramPrompt: string | null = null;
function getAiProgramPrompt() {
  if (cachedAiProgramPrompt === null) {
    cachedAiProgramPrompt = buildAiProgramPrompt();
  }
  return cachedAiProgramPrompt;
}

export default function SettingsScreen() {
  const importPrograms = useProgramStore((s) => s.importPrograms);
  const programs = useProgramStore((s) => s.programs);
  const programsCount = useProgramStore((s) => s.programs.length);
  const sessionsCount = useSessionStore((s) => s.sessions.length);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [aiPromptCopyFeedback, setAiPromptCopyFeedback] = useState(0);
  const aiPromptCopied = aiPromptCopyFeedback > 0;

  useEffect(() => {
    if (aiPromptCopyFeedback === 0) return;

    const timeout = setTimeout(() => {
      setAiPromptCopyFeedback(0);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [aiPromptCopyFeedback]);

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

  const handleCopyAiPrompt = async () => {
    try {
      await Clipboard.setStringAsync(getAiProgramPrompt());
      setAiPromptCopyFeedback((current) => current + 1);
    } catch {
      try {
        await Share.share({ message: getAiProgramPrompt() });
      } catch {
        Alert.alert('Erreur', 'Impossible de copier ou partager le prompt.');
      }
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
          <Text style={styles.sectionTitle}>Générer un programme avec une IA</Text>
          <Text style={styles.helpText}>
            Copie ce prompt avec le bouton ci-dessous, puis colle-le dans ChatGPT/Claude pour générer un programme, et importe le JSON obtenu.
          </Text>

          <Button
            title={aiPromptCopied ? 'Copié ✓' : 'Copier le prompt'}
            variant="secondary"
            onPress={handleCopyAiPrompt}
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
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 32, paddingBottom: 40 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  actionBtn: { marginTop: 4 },
  helpText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  codeBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    padding: 12,
  },
  code: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: colors.textPrimary },
  aboutText: { fontSize: 15, fontWeight: '500', color: colors.textPrimary },
  aboutSubtext: { fontSize: 13, color: colors.textSecondary },
});
