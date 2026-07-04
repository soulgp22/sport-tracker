import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { useProgressData, useExercisesWithHistory } from '../../../hooks/useProgressData';
import { WeightChart } from '../../../components/progress/WeightChart';
import { VolumeChart } from '../../../components/progress/VolumeChart';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function ProgressScreen() {
  const exercises = useExercisesWithHistory();
  const [selectedId, setSelectedId] = useState<string | null>(exercises[0]?.id ?? null);
  const { maxWeightPoints, volumePoints } = useProgressData(selectedId ?? '');

  if (exercises.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <EmptyState
          icon="trending-up-outline"
          title="Aucune donnée"
          subtitle="Loggez des séances pour voir votre progression"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Exercise selector */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  selectorScroll: { flexGrow: 0, flexShrink: 0 },
  selectorRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8, alignItems: 'center' },
  chip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#e5e7eb',
  },
  chipSelected: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  chipTextSelected: { color: '#fff' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  hint: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
