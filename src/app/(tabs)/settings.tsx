import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { File as ExpoFile, Paths } from 'expo-file-system';

import { Button } from '../../components/ui/Button';
import { appAlert } from '../../components/ui/AppDialog';
import { TextInput } from '../../components/ui/TextInput';
import { useColors } from '../../theme/useColors';
import { PALETTES, type PaletteId, type ThemeColors } from '../../theme/palettes';
import { FONT_THEMES, fonts, type FontId } from '../../theme/fonts';
import {
  buildProfileBackup,
  parseProfileBackup,
  restoreProfileBackup,
  type ProfileBackup,
} from '../../lib/profileBackup';
import {
  assertImportFileSize,
  assertImportTextSize,
  getImportErrorMessage,
} from '../../lib/importLimits';
import { useBodyWeightStore } from '../../store/bodyWeightStore';
import { useExerciseCatalogStore } from '../../store/exerciseCatalogStore';
import { useFoodDiaryStore } from '../../store/foodDiaryStore';
import { useFoodStore } from '../../store/foodStore';
import { useNutritionGoalsStore } from '../../store/nutritionGoalsStore';
import { useProgramStore } from '../../store/programStore';
import { useSessionStore } from '../../store/sessionStore';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { usePerformanceStore } from '../../store/performanceStore';
import { LANGUAGE_OPTIONS, type LanguageId } from '../../i18n/translations';
import { useTranslation } from '../../i18n/useTranslation';
import { requestNotificationPermission } from '../../lib/restTimerNotifications';
import { combineAiProgramPrompt } from '../../lib/aiProgramPrompt';
import type { ExperienceLevel, PerformanceSex } from '../../types/performance';

const SEX_OPTIONS: { id: PerformanceSex; labelKey: string }[] = [
  { id: 'unspecified', labelKey: 'performance.sexUnspecified' },
  { id: 'female', labelKey: 'performance.sexFemale' },
  { id: 'male', labelKey: 'performance.sexMale' },
];

const EXPERIENCE_OPTIONS: { id: ExperienceLevel; labelKey: string }[] = [
  { id: 'beginner', labelKey: 'performance.experienceBeginner' },
  { id: 'intermediate', labelKey: 'performance.experienceIntermediate' },
  { id: 'advanced', labelKey: 'performance.experienceAdvanced' },
  { id: 'expert', labelKey: 'performance.experienceExpert' },
];

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
function getAiProgramPrompt(programDescription: string) {
  if (cachedAiProgramPrompt === null) {
    cachedAiProgramPrompt = buildAiProgramPrompt();
  }
  return combineAiProgramPrompt(cachedAiProgramPrompt, programDescription);
}

function profileSummary(data: ProfileBackup['data']) {
  return `${data.programs.length} programme(s), ${data.sessions.length} séance(s), ${data.customFoods.length} aliment(s), ${data.foodDiaryEntries.length} entrée(s) nutrition, ${data.bodyWeightEntries.length} pesée(s).`;
}

export default function SettingsScreen() {
  const c = useColors();
  const { language, t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const importPrograms = useProgramStore((s) => s.importPrograms);
  const programs = useProgramStore((s) => s.programs);
  const programsCount = useProgramStore((s) => s.programs.length);
  const sessionsCount = useSessionStore((s) => s.sessions.length);
  const customFoodsCount = useFoodStore((s) => s.customFoods.length);
  const foodDiaryEntriesCount = useFoodDiaryStore((s) => s.entries.length);
  const nutritionGoals = useNutritionGoalsStore((s) => s.goals);
  const bodyWeightEntriesCount = useBodyWeightStore((s) => s.entries.length);
  const paletteId = useThemeStore((s) => s.paletteId);
  const setPalette = useThemeStore((s) => s.setPalette);
  const fontId = useThemeStore((s) => s.fontId);
  const setFont = useThemeStore((s) => s.setFont);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const programDescription = usePerformanceStore((s) => s.programDescription);
  const setProgramDescription = usePerformanceStore((s) => s.setProgramDescription);
  const performanceSex = usePerformanceStore((s) => s.sex);
  const setPerformanceSex = usePerformanceStore((s) => s.setSex);
  const performanceAge = usePerformanceStore((s) => s.age);
  const setPerformanceAge = usePerformanceStore((s) => s.setAge);
  const experience = usePerformanceStore((s) => s.experience);
  const setExperience = usePerformanceStore((s) => s.setExperience);
  const weeklySessionGoal = usePerformanceStore((s) => s.weeklySessionGoal);
  const monthlySessionGoal = usePerformanceStore((s) => s.monthlySessionGoal);
  const setWeeklySessionGoal = usePerformanceStore((s) => s.setWeeklySessionGoal);
  const setMonthlySessionGoal = usePerformanceStore((s) => s.setMonthlySessionGoal);
  const notificationsEnabled = usePerformanceStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = usePerformanceStore((s) => s.setNotificationsEnabled);
  const [openAppearanceMenu, setOpenAppearanceMenu] =
    useState<'language' | 'palette' | 'font' | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [profileImporting, setProfileImporting] = useState(false);
  const [profileExporting, setProfileExporting] = useState(false);
  const [aiPromptCopyFeedback, setAiPromptCopyFeedback] = useState(0);
  const [ageDraft, setAgeDraft] = useState<string | null>(null);
  const ageInput = ageDraft ?? (performanceAge ? String(performanceAge) : '');
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
      appAlert('Échec de l\'import', result.errors.join('\n'));
    } else if (result.errors.length > 0 || result.skipped > 0) {
      appAlert(
        'Import partiel',
        `${result.importedPrograms} programme(s), ${result.importedExercises} exercice(s) importé(s).\n${result.skipped} élément(s) ignoré(s).`
      );
    } else {
      appAlert(
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
      appAlert(
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

        assertImportFileSize(file.size);
        const text = await file.text();
        assertImportTextSize(text);
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
      assertImportFileSize(asset.size);
      const content = await FileSystemLegacy.readAsStringAsync(asset.uri);
      assertImportTextSize(content);
      confirmAndImport(content);
    } catch (error) {
      appAlert(
        'Erreur',
        getImportErrorMessage(
          error,
          "Impossible de lire le fichier. Vérifiez qu'il s'agit d'un fichier JSON valide."
        )
      );
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
        appAlert('Export prêt', `${programs.length} programme(s) exporté(s).`);
        return;
      }

      const file = new ExpoFile(Paths.document, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(content);
      appAlert('Export prêt', `Fichier créé : ${file.uri}`);
    } catch {
      appAlert('Erreur', "Impossible d'exporter les programmes.");
    } finally {
      setExporting(false);
    }
  };

  const handleProfileExport = async () => {
    try {
      setProfileExporting(true);
      const content = buildProfileBackup();
      const filename = `sport-tracker-profil-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        appAlert(
          'Sauvegarde prête',
          "Ce fichier contient vos données sport et nutrition en clair. Conservez-le dans un emplacement privé."
        );
        return;
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        appAlert('Erreur', "Le partage de fichier n'est pas disponible sur cet appareil.");
        return;
      }

      const file = new ExpoFile(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(content);
      try {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Sauvegarder mon profil Life Sport Tracker',
          UTI: 'public.json',
        });
      } finally {
        if (file.exists) file.delete();
      }
    } catch {
      appAlert('Erreur', 'Impossible de sauvegarder le profil.');
    } finally {
      setProfileExporting(false);
    }
  };

  const confirmAndRestoreProfile = (backup: ProfileBackup) => {
    appAlert(
      'Restaurer ce profil ?',
      `Cette restauration remplacera toutes les données actuelles (${programsCount} programme(s), ${sessionsCount} séance(s), ${customFoodsCount} aliment(s), ${foodDiaryEntriesCount} entrée(s) nutrition, objectifs ${nutritionGoals.goalType}, ${bodyWeightEntriesCount} pesée(s)).\n\nProfil à restaurer : ${profileSummary(backup.data)}\n\nContinuer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: () => {
            restoreProfileBackup(backup);
            appAlert('Profil restauré', profileSummary(backup.data));
          },
        },
      ]
    );
  };

  const handleProfileImport = async () => {
    try {
      setProfileImporting(true);
      let content: string | null = null;

      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        const file = await new Promise<globalThis.File | null>((resolve) => {
          input.onchange = () => resolve(input.files?.[0] ?? null);
          input.click();
        });
        if (file) {
          assertImportFileSize(file.size);
          content = await file.text();
          assertImportTextSize(content);
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });

        if (!result.canceled) {
          const asset = result.assets[0];
          assertImportFileSize(asset.size);
          content = await FileSystemLegacy.readAsStringAsync(asset.uri);
          assertImportTextSize(content);
        }
      }

      if (!content) return;

      const backup = parseProfileBackup(content);
      if (typeof backup === 'string') {
        appAlert('Échec de la restauration', backup);
        return;
      }

      confirmAndRestoreProfile(backup);
    } catch (error) {
      appAlert(
        'Erreur',
        getImportErrorMessage(
          error,
          "Impossible de lire le fichier. Vérifiez qu'il s'agit d'un fichier JSON valide."
        )
      );
    } finally {
      setProfileImporting(false);
    }
  };

  const handleCopyAiPrompt = async () => {
    const prompt = getAiProgramPrompt(programDescription);
    try {
      await Clipboard.setStringAsync(prompt);
      setAiPromptCopyFeedback((current) => current + 1);
    } catch {
      try {
        await Share.share({ message: prompt });
      } catch {
        appAlert('Erreur', 'Impossible de copier ou partager le prompt.');
      }
    }
  };

  const handleNotificationsToggle = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      appAlert(
        t('performance.notificationsDeniedTitle'),
        t('performance.notificationsDeniedBody')
      );
      return;
    }
    setNotificationsEnabled(true);
  };

  const handleDeleteAll = () => {
    appAlert(
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
          <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
          <Text style={styles.helpText}>
            {t('settings.appearanceHelp')}
          </Text>

          <View style={styles.dropdownGroup}>
            <Text style={styles.dropdownLabel}>{t('settings.language')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: openAppearanceMenu === 'language' }}
              onPress={() =>
                setOpenAppearanceMenu((current) => current === 'language' ? null : 'language')
              }
              activeOpacity={0.75}
              style={styles.dropdownTrigger}>
              <View style={styles.dropdownSelection}>
                <Text style={styles.dropdownValue}>
                  {LANGUAGE_OPTIONS.find((option) => option.id === language)?.nativeLabel}
                </Text>
                <Text style={styles.optionDescription}>{t('settings.languageHelp')}</Text>
              </View>
              <Ionicons
                name={openAppearanceMenu === 'language' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={c.textSecondary}
              />
            </TouchableOpacity>

            {openAppearanceMenu === 'language' ? (
              <View style={styles.dropdownMenu}>
                {LANGUAGE_OPTIONS.map((option) => {
                  const active = language === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => {
                        setLanguage(option.id as LanguageId);
                        setOpenAppearanceMenu(null);
                      }}
                      activeOpacity={0.72}
                      style={[styles.dropdownOption, active ? styles.dropdownOptionActive : null]}>
                      <View style={styles.optionText}>
                        <Text style={[styles.paletteLabel, active ? styles.paletteLabelActive : null]}>
                          {option.nativeLabel}
                        </Text>
                        <Text style={styles.optionDescription}>{option.label}</Text>
                      </View>
                      {active ? <Ionicons name="checkmark-circle" size={20} color={c.primary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.dropdownGroup}>
            <Text style={styles.dropdownLabel}>{t('settings.palette')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: openAppearanceMenu === 'palette' }}
              onPress={() =>
                setOpenAppearanceMenu((current) => current === 'palette' ? null : 'palette')
              }
              activeOpacity={0.75}
              style={styles.dropdownTrigger}>
              <View style={styles.dropdownSelection}>
                <Text style={styles.dropdownValue}>{PALETTES[paletteId].label}</Text>
                <View style={styles.swatches}>
                  {[
                    PALETTES[paletteId].colors.bg,
                    PALETTES[paletteId].colors.primary,
                    PALETTES[paletteId].colors.secondary,
                  ].map((color, index) => (
                    <View
                      key={`${paletteId}-selected-${index}`}
                      style={[styles.swatch, { backgroundColor: color }]}
                    />
                  ))}
                </View>
              </View>
              <Ionicons
                name={openAppearanceMenu === 'palette' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={c.textSecondary}
              />
            </TouchableOpacity>

            {openAppearanceMenu === 'palette' ? (
              <View style={styles.dropdownMenu}>
                {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
                  const palette = PALETTES[id];
                  const active = paletteId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => {
                        setPalette(id);
                        setOpenAppearanceMenu(null);
                      }}
                      activeOpacity={0.72}
                      style={[styles.dropdownOption, active ? styles.dropdownOptionActive : null]}>
                      <View style={styles.optionText}>
                        <Text style={[styles.paletteLabel, active ? styles.paletteLabelActive : null]}>
                          {palette.label}
                        </Text>
                        <Text style={styles.optionDescription}>
                          {palette.mode === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
                        </Text>
                      </View>
                      <View style={styles.swatches}>
                        {[palette.colors.bg, palette.colors.primary, palette.colors.secondary].map(
                          (color, index) => (
                            <View
                              key={`${id}-${index}`}
                              style={[styles.swatch, { backgroundColor: color }]}
                            />
                          )
                        )}
                      </View>
                      {active ? <Ionicons name="checkmark-circle" size={20} color={c.primary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={styles.dropdownGroup}>
            <Text style={styles.dropdownLabel}>{t('settings.font')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: openAppearanceMenu === 'font' }}
              onPress={() =>
                setOpenAppearanceMenu((current) => current === 'font' ? null : 'font')
              }
              activeOpacity={0.75}
              style={styles.dropdownTrigger}>
              <View style={styles.dropdownSelection}>
                <Text
                  style={[
                    styles.dropdownValue,
                    { fontFamily: FONT_THEMES[fontId].tokens.serifBold },
                  ]}>
                  {FONT_THEMES[fontId].label}
                </Text>
                <Text style={styles.optionDescription}>{FONT_THEMES[fontId].description}</Text>
              </View>
              <Ionicons
                name={openAppearanceMenu === 'font' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={c.textSecondary}
              />
            </TouchableOpacity>

            {openAppearanceMenu === 'font' ? (
              <View style={styles.dropdownMenu}>
                {(Object.keys(FONT_THEMES) as FontId[]).map((id) => {
                  const fontTheme = FONT_THEMES[id];
                  const active = fontId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      onPress={() => {
                        setFont(id);
                        setOpenAppearanceMenu(null);
                      }}
                      activeOpacity={0.72}
                      style={[styles.dropdownOption, active ? styles.dropdownOptionActive : null]}>
                      <View style={styles.optionText}>
                        <Text
                          style={[
                            styles.fontPreview,
                            { fontFamily: fontTheme.tokens.serifBold },
                            active ? styles.paletteLabelActive : null,
                          ]}>
                          {fontTheme.label}
                        </Text>
                        <Text
                          style={[
                            styles.optionDescription,
                            { fontFamily: fontTheme.tokens.sans },
                          ]}>
                          {fontTheme.description}
                        </Text>
                      </View>
                      {active ? <Ionicons name="checkmark-circle" size={20} color={c.primary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
          <Text style={styles.helpText}>
            La sauvegarde contient vos programmes, séances, aliments personnalisés, données nutrition et poids. Conservez le fichier hors de l&apos;app (Drive, Téléchargements…) pour qu&apos;il survive à une réinstallation.
          </Text>

          <Button
            title={t('settings.saveProfile')}
            onPress={handleProfileExport}
            loading={profileExporting}
            style={styles.actionBtn}
          />

          <Button
            title={t('settings.restoreProfile')}
            variant="secondary"
            onPress={handleProfileImport}
            loading={profileImporting}
            style={styles.actionBtn}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('performance.profileTitle')}</Text>
          <Text style={styles.helpText}>{t('performance.profileHelp')}</Text>

          <Text style={styles.fieldLabel}>{t('performance.sex')}</Text>
          <View style={styles.choiceRow}>
            {SEX_OPTIONS.map((option) => {
              const active = performanceSex === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.choiceChip, active ? styles.choiceChipActive : null]}
                  onPress={() => setPerformanceSex(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}>
                  <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            label={t('performance.age')}
            value={ageInput}
            onChangeText={(value) => setAgeDraft(value.replace(/\D/g, '').slice(0, 3))}
            onEndEditing={() => {
              setPerformanceAge(ageInput ? Number(ageInput) : undefined);
              setAgeDraft(null);
            }}
            keyboardType="number-pad"
            maxLength={3}
            placeholder={t('performance.agePlaceholder')}
          />

          <Text style={styles.fieldLabel}>{t('performance.experience')}</Text>
          <View style={styles.choiceRow}>
            {EXPERIENCE_OPTIONS.map((option) => {
              const active = experience === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.choiceChip, active ? styles.choiceChipActive : null]}
                  onPress={() => setExperience(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}>
                  <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.goalRow}>
            <View style={styles.goalCopy}>
              <Text style={styles.fieldLabel}>{t('performance.weeklyGoal')}</Text>
              <Text style={styles.goalHint}>{t('performance.sessionsUnit')}</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setWeeklySessionGoal(weeklySessionGoal - 1)}
                accessibilityLabel={t('performance.decreaseGoal')}>
                <Ionicons name="remove" size={18} color={c.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{weeklySessionGoal}</Text>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setWeeklySessionGoal(weeklySessionGoal + 1)}
                accessibilityLabel={t('performance.increaseGoal')}>
                <Ionicons name="add" size={18} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.goalRow}>
            <View style={styles.goalCopy}>
              <Text style={styles.fieldLabel}>{t('performance.monthlyGoal')}</Text>
              <Text style={styles.goalHint}>{t('performance.sessionsUnit')}</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setMonthlySessionGoal(monthlySessionGoal - 1)}
                accessibilityLabel={t('performance.decreaseGoal')}>
                <Ionicons name="remove" size={18} color={c.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{monthlySessionGoal}</Text>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => setMonthlySessionGoal(monthlySessionGoal + 1)}
                accessibilityLabel={t('performance.increaseGoal')}>
                <Ionicons name="add" size={18} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notificationRow}
            onPress={handleNotificationsToggle}
            accessibilityRole="switch"
            accessibilityState={{ checked: notificationsEnabled }}>
            <View style={styles.notificationCopy}>
              <Text style={styles.fieldLabel}>{t('performance.notifications')}</Text>
              <Text style={styles.goalHint}>{t('performance.notificationsHelp')}</Text>
            </View>
            <View style={[styles.switchTrack, notificationsEnabled ? styles.switchTrackActive : null]}>
              <View style={[styles.switchThumb, notificationsEnabled ? styles.switchThumbActive : null]} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.programs')}</Text>

          <Button
            title={t('settings.importProgram')}
            onPress={handleImport}
            loading={importing}
            style={styles.actionBtn}
          />

          <Button
            title={t('settings.exportPrograms')}
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
          <Text style={styles.sectionTitle}>{t('settings.aiProgram')}</Text>
          <Text style={styles.helpText}>
            Copie ce prompt avec le bouton ci-dessous, puis colle-le dans ChatGPT/Claude pour générer un programme, et importe le JSON obtenu.
          </Text>

          <TextInput
            label={t('settings.programDescription')}
            value={programDescription}
            onChangeText={setProgramDescription}
            placeholder={t('settings.programDescriptionPlaceholder')}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={4000}
            style={styles.descriptionInput}
          />
          <Text style={styles.counterText}>{programDescription.length} / 4000</Text>

          <Button
            title={aiPromptCopied ? t('settings.copied') : t('settings.copyPrompt')}
            variant="secondary"
            onPress={handleCopyAiPrompt}
            style={styles.actionBtn}
          />

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.importFormat')}</Text>
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
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <Text style={styles.aboutText}>Life Sport Tracker v1.0.0</Text>
          <Text style={styles.aboutSubtext}>
            {t('settings.aboutSubtitle')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, gap: 32, paddingBottom: 40 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.serifBold,
    color: c.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingBottom: 8,
  },
  actionBtn: { marginTop: 4 },
  helpText: { fontSize: 13, fontFamily: fonts.sans, color: c.textSecondary, lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontFamily: fonts.sansSemi, color: c.textPrimary },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  choiceChipActive: { borderColor: c.primary, backgroundColor: c.accentSoft },
  choiceText: { fontSize: 12, fontFamily: fonts.sansSemi, color: c.textSecondary },
  choiceTextActive: { color: c.primary },
  goalRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  goalCopy: { flex: 1, gap: 2 },
  goalHint: { fontSize: 11, lineHeight: 15, fontFamily: fonts.sans, color: c.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  stepValue: { minWidth: 24, textAlign: 'center', fontSize: 17, fontFamily: fonts.sansBold, color: c.textPrimary },
  notificationRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  notificationCopy: { flex: 1, gap: 3 },
  switchTrack: {
    width: 48,
    height: 28,
    padding: 3,
    borderRadius: 14,
    justifyContent: 'center',
    backgroundColor: c.border,
  },
  switchTrackActive: { backgroundColor: c.primary },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.surface },
  switchThumbActive: { alignSelf: 'flex-end' },
  descriptionInput: { minHeight: 132, paddingTop: 12 },
  counterText: { marginTop: -8, textAlign: 'right', fontSize: 10, fontFamily: fonts.sans, color: c.textMuted },
  dropdownGroup: { gap: 7 },
  dropdownLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 13,
    color: c.textSecondary,
  },
  dropdownTrigger: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  dropdownSelection: { flex: 1, gap: 5 },
  dropdownValue: { fontFamily: fonts.sansBold, fontSize: 16, color: c.textPrimary },
  dropdownMenu: {
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  dropdownOption: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  dropdownOptionActive: { backgroundColor: c.accentSoft },
  optionText: { flex: 1, gap: 2 },
  optionDescription: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: c.textSecondary,
  },
  paletteLabel: { fontFamily: fonts.sansSemi, fontSize: 15, color: c.textPrimary },
  paletteLabelActive: { color: c.primary },
  fontPreview: { fontSize: 18, color: c.textPrimary },
  swatches: { flexDirection: 'row', gap: 7 },
  swatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: c.border },
  codeBlock: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 8,
    padding: 12,
  },
  code: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: c.textPrimary },
  aboutText: { fontSize: 15, fontWeight: '500', color: c.textPrimary },
  aboutSubtext: { fontSize: 13, color: c.textSecondary },
});
