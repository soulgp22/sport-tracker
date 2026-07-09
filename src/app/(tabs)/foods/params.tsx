import { useState } from 'react';
import {
  Alert,
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
import { colors } from '../../../constants/colors';
import { useFoodStore, type ImportFoodsResult } from '../../../store/foodStore';
import type { Food } from '../../../types';

function CustomFoodRow({
  food,
  onOpen,
  onDelete,
}: {
  food: Food;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={styles.foodRow} onPress={onOpen} activeOpacity={0.75}>
      <View style={styles.foodBody}>
        <Text style={styles.foodName} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={styles.foodMeta} numberOfLines={1}>
          {food.category} · {food.unit}
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
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
  const router = useRouter();
  const importFoods = useFoodStore((s) => s.importFoods);
  const deleteCustomFood = useFoodStore((s) => s.deleteCustomFood);
  const customFoods = useFoodStore((s) => s.customFoods);
  const [importing, setImporting] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);

  const showImportResult = (result: ImportFoodsResult) => {
    if (result.errors.length > 0 && result.added === 0) {
      Alert.alert("Échec de l'import", buildImportMessage(result));
      return;
    }

    if (result.errors.length > 0 || result.duplicateIds.length > 0) {
      Alert.alert('Import partiel', buildImportMessage(result));
      return;
    }

    Alert.alert('Import réussi', buildImportMessage(result));
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

        const text = await file.text();
        confirmAndImport(text);
        return;
      }

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

        const content = await file.text();
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
      const content = await FileSystemLegacy.readAsStringAsync(asset.uri);
      const importResult = useFoodStore.getState().importFoodsFromCsv(content);
      showImportResult(importResult);
    } catch {
      Alert.alert('Erreur', 'Impossible de lire le fichier CSV.');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleDelete = (food: Food) => {
    Alert.alert('Supprimer', `Supprimer "${food.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => deleteCustomFood(food.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading}>Paramètres aliments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Import</Text>
          <Text style={styles.helpText}>
            Importez un fichier JSON contenant un tableau d'aliments ou un objet avec la clé foods.
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
          <Text style={styles.sectionTitle}>
            Mes aliments personnalisés ({customFoods.length})
          </Text>

          {customFoods.length === 0 ? (
            <Text style={styles.helpText}>Aucun aliment personnalisé pour le moment.</Text>
          ) : (
            <View style={styles.foodList}>
              {customFoods.map((food) => (
                <CustomFoodRow
                  key={food.id}
                  food={food}
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
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  content: { padding: 16, gap: 28, paddingBottom: 40 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  helpText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  codeBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    padding: 12,
  },
  code: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.textPrimary,
    lineHeight: 16,
  },
  foodList: { gap: 8 },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  foodBody: { flex: 1, gap: 2 },
  foodName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  foodMeta: { fontSize: 12, color: colors.textSecondary },
  deleteButton: { paddingHorizontal: 8 },
});
