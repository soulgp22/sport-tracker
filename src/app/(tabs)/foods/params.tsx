import { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../components/ui/Button';
import { appAlert } from '../../../components/ui/AppDialog';
import {
  assertImportFileSize,
  assertImportTextSize,
  getImportErrorMessage,
} from '../../../lib/importLimits';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { useTranslation } from '../../../i18n/useTranslation';
import { useFoodStore, type ImportFoodsResult } from '../../../store/foodStore';
import type { Food } from '../../../types';

function CustomFoodRow({
  food,
  onOpen,
  onDelete,
  selectionMode,
  selected,
  onToggle,
  onLongPress,
}: {
  food: Food;
  onOpen: () => void;
  onDelete: () => void;
  selectionMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onLongPress: () => void;
}) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <TouchableOpacity
      style={[styles.foodRow, selected ? styles.foodRowSelected : null]}
      onPress={selectionMode ? onToggle : onOpen}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      accessibilityRole={selectionMode ? 'checkbox' : 'button'}
      accessibilityState={selectionMode ? { checked: selected } : undefined}>
      {selectionMode ? (
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={selected ? c.primary : c.textMuted}
        />
      ) : null}
      <View style={styles.foodBody}>
        <Text style={styles.foodName} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={styles.foodMeta} numberOfLines={1}>
          {food.category} · {food.unit}
        </Text>
      </View>
      {!selectionMode ? (
        <>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={8}
            style={styles.deleteButton}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.delete')} ${food.name}`}>
            <Ionicons name="trash-outline" size={18} color={c.danger} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
        </>
      ) : null}
    </TouchableOpacity>
  );
}

function buildImportMessage(result: ImportFoodsResult) {
  const duplicateCount = result.duplicateIds.length;
  const lines = [
    `${result.added} aliment(s) ajouté(s).`,
    `${duplicateCount} doublon(s) ignoré(s).`,
    `${result.errors.length} erreur(s).`,
  ];

  if (result.errors.length > 0) {
    const preview = result.errors.slice(0, 6).join('\n');
    const remaining =
      result.errors.length > 6 ? `\n… et ${result.errors.length - 6} autre(s)` : '';
    lines.push('', preview + remaining);
  }

  if (duplicateCount > 0) {
    const preview = result.duplicateIds.slice(0, 6).join(', ');
    const remaining =
      duplicateCount > 6 ? `, … et ${duplicateCount - 6} autre(s)` : '';
    lines.push('', `Doublons : ${preview}${remaining}`);
  }

  return lines.join('\n');
}

export default function FoodParamsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { t } = useTranslation();
  const router = useRouter();
  const importFoods = useFoodStore((s) => s.importFoods);
  const deleteCustomFood = useFoodStore((s) => s.deleteCustomFood);
  const deleteCustomFoods = useFoodStore((s) => s.deleteCustomFoods);
  const customFoods = useFoodStore((s) => s.customFoods);
  const [importing, setImporting] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const showImportResult = (result: ImportFoodsResult) => {
    if (result.errors.length > 0 && result.added === 0) {
      appAlert(t('dialog.importFailed'), buildImportMessage(result));
      return;
    }

    if (result.errors.length > 0 || result.duplicateIds.length > 0) {
      appAlert(t('dialog.importPartial'), buildImportMessage(result));
      return;
    }

    appAlert(t('dialog.importSuccess'), buildImportMessage(result));
  };

  const confirmAndImport = (content: string) => {
    showImportResult(importFoods(content));
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
        getImportErrorMessage(
          error,
          "Impossible de lire le fichier. Vérifiez qu'il s'agit d'un fichier JSON valide."
        )
      );
    } finally {
      setImporting(false);
    }
  };

  const handleImportCsv = async () => {
    try {
      setImportingCsv(true);

      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        const file = await new Promise<globalThis.File | null>((resolve) => {
          input.onchange = () => resolve(input.files?.[0] ?? null);
          input.click();
        });
        if (!file) return;

        assertImportFileSize(file.size);
        const content = await file.text();
        assertImportTextSize(content);
        const result = useFoodStore.getState().importFoodsFromCsv(content);
        showImportResult(result);
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      assertImportFileSize(asset.size);
      const content = await FileSystemLegacy.readAsStringAsync(asset.uri);
      assertImportTextSize(content);
      const importResult = useFoodStore.getState().importFoodsFromCsv(content);
      showImportResult(importResult);
    } catch (error) {
      appAlert(
        t('common.error'),
        getImportErrorMessage(error, 'Impossible de lire le fichier CSV.')
      );
    } finally {
      setImportingCsv(false);
    }
  };

  const handleDelete = (food: Food) => {
    appAlert(t('foods.deleteTitle'), t('foods.deleteConfirm', { name: food.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteCustomFood(food.id),
      },
    ]);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const enterSelectionMode = (id?: string) => {
    setSelectionMode(true);
    setSelectedIds(id ? new Set([id]) : new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === customFoods.length) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(customFoods.map((food) => food.id)));
  };

  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;

    appAlert(
      t('foods.deleteTitle'),
      t('dialog.deleteFoodsMessage', { count }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            const deleted = deleteCustomFoods([...selectedIds]);
            exitSelectionMode();
            appAlert(
              t('dialog.deleteDone'),
              t('dialog.deleteDoneMessage', { count: deleted })
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading}>Paramètres aliments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import</Text>
          <Text style={styles.helpText}>
            Importez un fichier JSON contenant un tableau d&apos;aliments ou un objet avec la clé foods.
            Les ids déjà présents sont ignorés.
          </Text>
          <Button
            title="Importer des aliments (JSON)"
            onPress={handleImport}
            loading={importing}
          />

          <Text style={styles.helpText}>
            Importez plusieurs aliments d&apos;un coup depuis un fichier CSV (import en masse). Colonnes reconnues : nom, categorie, unite, calories, proteines, glucides, lipides (fibres, sucre, sel optionnels).
          </Text>
          <Button
            title="Importer des aliments (CSV)"
            onPress={handleImportCsv}
            loading={importingCsv}
          />

          <Text style={styles.helpText}>Format CSV</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>
              {'nom;categorie;unite;calories;proteines;glucides;lipides\nYaourt grec 0%;Produits laitiers;g;59;10;3.6;0.4'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Format attendu</Text>
          <Text style={styles.helpText}>
            Chaque aliment doit contenir id, name, category, unit et nutritionPer100g avec calories,
            protein, carbs et fat. Unités autorisées : g, ml, portion, unité.
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>
              {JSON.stringify(
                {
                  foods: [
                    {
                      id: 'yaourt_grec_0',
                      name: 'Yaourt grec 0%',
                      category: 'Produits laitiers',
                      unit: 'g',
                      nutritionPer100g: {
                        calories: 59,
                        protein: 10,
                        carbs: 3.6,
                        fat: 0.4,
                        sugar: 3.6,
                      },
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
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleFlexible]}>
              Mes aliments personnalisés ({customFoods.length})
            </Text>
            {customFoods.length > 0 ? (
              <TouchableOpacity
                onPress={selectionMode ? exitSelectionMode : () => enterSelectionMode()}
                accessibilityRole="button"
                style={styles.selectionLink}>
                <Text style={styles.selectionLinkText}>
                  {selectionMode ? t('common.cancel') : t('common.select')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {customFoods.length === 0 ? (
            <Text style={styles.helpText}>Aucun aliment personnalisé pour le moment.</Text>
          ) : (
            <>
              {selectionMode ? (
                <View style={styles.selectionToolbar}>
                  <TouchableOpacity
                    onPress={toggleSelectAll}
                    accessibilityRole="button"
                    style={styles.selectAllButton}>
                    <Ionicons
                      name={
                        selectedIds.size === customFoods.length
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={20}
                      color={c.primary}
                    />
                    <Text style={styles.selectAllText}>
                      {selectedIds.size === customFoods.length
                        ? 'Tout désélectionner'
                        : 'Tout sélectionner'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.selectionCount}>{selectedIds.size} sélectionné(s)</Text>
                </View>
              ) : (
                <Text style={styles.selectionHint}>
                  Appui long sur un aliment pour démarrer une sélection multiple.
                </Text>
              )}

              <View style={styles.foodList}>
                {customFoods.map((food) => (
                  <CustomFoodRow
                    key={food.id}
                    food={food}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(food.id)}
                    onToggle={() => toggleSelection(food.id)}
                    onLongPress={() => {
                      if (!selectionMode) enterSelectionMode(food.id);
                    }}
                    onOpen={() =>
                      router.push({
                        pathname: '/(tabs)/foods/[id]' as never,
                        params: { id: food.id },
                      })
                    }
                    onDelete={() => handleDelete(food)}
                  />
                ))}
              </View>

              {selectionMode ? (
                <Button
                  title={`${t('common.delete')} (${selectedIds.size})`}
                  variant="danger"
                  disabled={selectedIds.size === 0}
                  onPress={handleDeleteSelected}
                />
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { flex: 1, fontSize: 18, fontWeight: '700', color: c.textPrimary },
  content: { padding: 16, gap: 28, paddingBottom: 40 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  sectionTitleFlexible: { flex: 1, borderBottomWidth: 0 },
  selectionLink: { paddingHorizontal: 4, paddingVertical: 10 },
  selectionLinkText: { fontSize: 13, fontWeight: '700', color: c.primary },
  helpText: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
  codeBlock: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 8,
    padding: 12,
  },
  code: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: c.textPrimary,
    lineHeight: 16,
  },
  foodList: { gap: 8 },
  selectionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectAllButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  selectAllText: { fontSize: 13, fontWeight: '700', color: c.primary },
  selectionCount: { fontSize: 12, color: c.textSecondary },
  selectionHint: { fontSize: 12, color: c.textMuted },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  foodRowSelected: {
    borderWidth: 1.5,
    borderColor: c.primary,
    backgroundColor: c.accentSoft,
  },
  foodBody: { flex: 1, gap: 2 },
  foodName: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  foodMeta: { fontSize: 12, color: c.textSecondary },
  deleteButton: { paddingHorizontal: 8 },
});
