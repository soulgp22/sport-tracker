import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WeightChart } from '../../../components/progress/WeightChart';
import { VolumeChart } from '../../../components/progress/VolumeChart';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { TextInput } from '../../../components/ui/TextInput';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { useProgressData, useExercisesWithHistory, type DataPoint } from '../../../hooks/useProgressData';
import { useBodyWeightStore } from '../../../store/bodyWeightStore';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';

type ProgressMode = 'exercises' | 'bodyWeight';

function parseNumberInput(value: string) {
  return Number(value.trim().replace(',', '.'));
}

function toShortDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return isoDate.slice(0, 10);
  return `${day}/${month}`;
}

export default function ProgressScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const exercises = useExercisesWithHistory();
  const [mode, setMode] = useState<ProgressMode>('exercises');
  const [selectedId, setSelectedId] = useState<string | null>(exercises[0]?.id ?? null);
  const [weightInput, setWeightInput] = useState('');

  const { maxWeightPoints, volumePoints } = useProgressData(selectedId ?? '');
  const bodyWeightEntries = useBodyWeightStore((s) => s.entries);
  const addBodyWeightEntry = useBodyWeightStore((s) => s.addEntry);
  const targetWeight = useNutritionGoalsStore((s) => s.goals.targetWeight);

  useEffect(() => {
    if (!selectedId && exercises.length > 0) {
      setSelectedId(exercises[0].id);
    }
  }, [exercises, selectedId]);

  const parsedWeight = parseNumberInput(weightInput);
  const canSaveWeight = weightInput.trim().length > 0 && Number.isFinite(parsedWeight) && parsedWeight >= 0;

  const bodyWeightPoints = useMemo<DataPoint[]>(
    () =>
      [...bodyWeightEntries]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((entry) => ({
          date: entry.date.slice(0, 10),
          label: toShortDateLabel(entry.date),
          value: entry.weight,
        })),
    [bodyWeightEntries]
  );

  const handleSaveWeight = () => {
    if (!canSaveWeight) return;

    addBodyWeightEntry(parsedWeight);
    setWeightInput('');
  };

  const renderModeSelector = () => (
    <View style={styles.modeRow}>
      <TouchableOpacity
        style={[styles.chip, mode === 'exercises' && styles.chipSelected]}
        onPress={() => setMode('exercises')}
        activeOpacity={0.75}>
        <Text style={[styles.chipText, mode === 'exercises' && styles.chipTextSelected]}>
          Exercices
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chip, mode === 'bodyWeight' && styles.chipSelected]}
        onPress={() => setMode('bodyWeight')}
        activeOpacity={0.75}>
        <Text style={[styles.chipText, mode === 'bodyWeight' && styles.chipTextSelected]}>
          Poids corporel
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {renderModeSelector()}

      {mode === 'exercises' ? (
        <>
          {exercises.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectorScroll}
              contentContainerStyle={styles.selectorRow}>
              {exercises.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[styles.chip, selectedId === ex.id && styles.chipSelected]}
                  onPress={() => setSelectedId(ex.id)}
                  activeOpacity={0.75}>
                  <Text style={[styles.chipText, selectedId === ex.id && styles.chipTextSelected]}>
                    {ex.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          {exercises.length === 0 ? (
            <EmptyState
              icon="trending-up-outline"
              title="Aucune donnée"
              subtitle="Loggez des séances pour voir votre progression"
            />
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              {selectedId ? (
                <>
                  <View style={styles.chartCard}>
                    <WeightChart data={maxWeightPoints} />
                  </View>
                  <View style={styles.chartCard}>
                    <VolumeChart data={volumePoints} />
                  </View>
                  {maxWeightPoints.length === 0 && (
                    <Text style={styles.hint}>
                      Loggez au moins une séance avec cet exercice pour voir les graphiques.
                    </Text>
                  )}
                </>
              ) : null}
            </ScrollView>
          )}
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formRow}>
            <View style={styles.weightInput}>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="numeric"
                placeholder="Poids (kg)"
              />
            </View>
            <Button
              title="Enregistrer"
              onPress={handleSaveWeight}
              disabled={!canSaveWeight}
              style={styles.saveButton}
            />
          </View>

          {bodyWeightPoints.length === 0 ? (
            <View style={styles.chartCard}>
              <Text style={styles.emptyWeightText}>
                Enregistrez votre premier poids pour commencer le suivi.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.chartCard}>
                <WeightChart data={bodyWeightPoints} title="Poids corporel (kg)" />
              </View>
              {targetWeight !== undefined ? (
                <Text style={styles.hint}>Objectif : {targetWeight} kg</Text>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  modeRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8, alignItems: 'center' },
  selectorScroll: { flexGrow: 0, flexShrink: 0 },
  selectorRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8, alignItems: 'center' },
  chip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: c.surfaceAlt,
  },
  chipSelected: { backgroundColor: c.primary },
  chipText: { fontSize: 14, fontWeight: '500', color: c.textPrimary },
  chipTextSelected: { color: c.primaryText },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  formRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  weightInput: { flex: 1, minWidth: 0 },
  saveButton: { minHeight: 46, paddingHorizontal: 14 },
  chartCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  hint: { fontSize: 13, color: c.textMuted, textAlign: 'center' },
  emptyWeightText: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
});
