import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useExerciseCatalogStore } from '../../store/exerciseCatalogStore';
import { AnimatedExerciseImage } from './AnimatedExerciseImage';
import { EmptyState } from '../ui/EmptyState';

/**
 * Fiche détail d'un exercice, réutilisable : route Exercices ET en modal
 * (depuis la séance ou l'éditeur de programme), pour que « retour » revienne
 * à l'écran d'origine et pas à la liste des exercices.
 */
export function ExerciseDetailView({ id, onClose }: { id: string; onClose: () => void }) {
  const exercise = useExerciseCatalogStore((s) => s.getById(id));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.heading} numberOfLines={1}>{exercise?.name ?? 'Exercice'}</Text>
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
            accessibilityLabel={exercise.name}
          />

          <View style={styles.metaCard}>
            <Text style={styles.title}>{exercise.name}</Text>
            <Text style={styles.meta}>
              {exercise.bodyPart} · {exercise.target} · {exercise.equipment}
            </Text>
            {exercise.secondaryMuscles.length > 0 ? (
              <Text style={styles.secondary}>
                Secondaires : {exercise.secondaryMuscles.join(', ')}
              </Text>
            ) : null}
          </View>

          <View style={styles.instructions}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {exercise.instructions.map((instruction, index) => (
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  heading: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  hero: { width: '100%', aspectRatio: 1.25, borderRadius: 12, backgroundColor: '#fff' },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', textTransform: 'capitalize' },
  meta: { fontSize: 14, color: '#2563eb', fontWeight: '600', textTransform: 'capitalize' },
  secondary: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize' },
  instructions: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  stepRow: { flexDirection: 'row', gap: 10 },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#374151' },
});
