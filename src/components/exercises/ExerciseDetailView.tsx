import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useExerciseCatalogStore } from '../../store/exerciseCatalogStore';
import {
  getExerciseDisplayInstructions,
  getExerciseDisplayName,
  translateEquipment,
  translateMuscle,
} from '../../constants/exerciseI18n';
import { AnimatedExerciseImage } from './AnimatedExerciseImage';
import { EmptyState } from '../ui/EmptyState';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';

/**
 * Fiche détail d'un exercice, réutilisable : route Exercices ET en modal
 * (depuis la séance ou l'éditeur de programme), pour que « retour » revienne
 * à l'écran d'origine et pas à la liste des exercices.
 */
export function ExerciseDetailView({ id, onClose }: { id: string; onClose: () => void }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const exercise = useExerciseCatalogStore((s) => s.getById(id));
  const displayName = exercise ? getExerciseDisplayName(exercise) : 'Exercice';
  const instructions = exercise ? getExerciseDisplayInstructions(exercise) : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading} numberOfLines={1}>{displayName}</Text>
        <View style={{ width: 24 }} />
      </View>

      {!exercise ? (
        <EmptyState icon="alert-circle-outline" title="Exercice introuvable" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <AnimatedExerciseImage
            id={exercise.id}
            animate
            style={styles.hero}
            accessibilityLabel={displayName}
          />

          <View style={styles.metaCard}>
            <Text style={styles.title}>{displayName}</Text>
            <Text style={styles.meta}>
              {translateMuscle(exercise.bodyPart)} · {translateMuscle(exercise.target)} ·{' '}
              {translateEquipment(exercise.equipment)}
            </Text>
            {exercise.secondaryMuscles.length > 0 ? (
              <Text style={styles.secondary}>
                Secondaires : {exercise.secondaryMuscles.map(translateMuscle).join(', ')}
              </Text>
            ) : null}
          </View>

          <View style={styles.instructions}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {instructions.map((instruction, index) => (
              <View key={`${exercise.id}-${index}`} style={styles.stepRow}>
                <Text style={styles.stepIndex}>{index + 1}</Text>
                <Text style={styles.stepText}>{instruction}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  heading: { flex: 1, fontSize: 18, fontWeight: '700', color: c.textPrimary },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  hero: { width: '100%', aspectRatio: 1.25, borderRadius: 12, backgroundColor: c.surface },
  metaCard: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  title: { fontSize: 22, fontWeight: '800', color: c.textPrimary },
  meta: { fontSize: 14, color: c.primary, fontWeight: '600' },
  secondary: { fontSize: 13, color: c.textSecondary },
  instructions: { backgroundColor: c.surface, borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  stepRow: { flexDirection: 'row', gap: 10 },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.accentSoft,
    color: c.primary,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.textPrimary },
});
