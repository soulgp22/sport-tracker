import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  getExerciseAliases,
  getExerciseDisplayInstructions,
  getExerciseDisplayName,
  translateEquipment,
  translateMuscle,
} from '../../constants/exerciseI18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useExerciseCatalogStore } from '../../store/exerciseCatalogStore';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { AnimatedExerciseImage } from './AnimatedExerciseImage';
import { EmptyState } from '../ui/EmptyState';

export function ExerciseDetailView({ id, onClose }: { id: string; onClose: () => void }) {
  const c = useColors();
  const { language, t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const exercise = useExerciseCatalogStore((state) => state.getById(id));
  const displayName = exercise ? getExerciseDisplayName(exercise, language) : t('nav.exercises');
  const instructions = exercise ? getExerciseDisplayInstructions(exercise, language) : [];
  const aliases = exercise ? getExerciseAliases(exercise.id, language) : [];

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
        <EmptyState icon="alert-circle-outline" title={t('exercise.notFound')} />
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
              {translateMuscle(exercise.bodyPart, language)} ·{' '}
              {translateMuscle(exercise.target, language)} ·{' '}
              {translateEquipment(exercise.equipment, language)}
            </Text>
            {exercise.secondaryMuscles.length > 0 ? (
              <Text style={styles.secondary}>
                {t('exercise.secondary')} :{' '}
                {exercise.secondaryMuscles
                  .map((muscle) => translateMuscle(muscle, language))
                  .join(', ')}
              </Text>
            ) : null}
            {aliases.length > 0 ? (
              <Text style={styles.aliases}>
                {t('exercise.knownAs')} : {aliases.join(', ')}
              </Text>
            ) : null}
          </View>

          <View style={styles.instructions}>
            <Text style={styles.sectionTitle}>{t('exercise.instructions')}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
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
  aliases: { fontSize: 12, color: c.primary, fontWeight: '600' },
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
