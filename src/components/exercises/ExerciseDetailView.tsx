import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  getExerciseDisplayName,
  translateEquipment,
  translateMuscle,
} from '../../constants/exerciseI18n';
import { useTranslation } from '../../i18n/useTranslation';
import { useExerciseCatalogStore } from '../../store/exerciseCatalogStore';
import { useColors } from '../../theme/useColors';
import { fonts } from '../../theme/fonts';

import type { ThemeColors } from '../../theme/palettes';
import { RAMP_WARM } from '../../theme/palettes';
import { AnimatedExerciseImage } from './AnimatedExerciseImage';
import { ExerciseModel3D } from './ExerciseModel3D';
import { exerciseModels } from '../../data/exerciseModels';
import { EmptyState } from '../ui/EmptyState';

export function ExerciseDetailView({ id, onClose }: { id: string; onClose: () => void }) {
  const c = useColors();
  const { language, t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const exercise = useExerciseCatalogStore((state) => state.getById(id));
  const displayName = exercise ? getExerciseDisplayName(exercise, language) : t('nav.exercises');
  const group = exercise ? translateMuscle(exercise.bodyPart, language) : '';
  const equipment = exercise ? translateEquipment(exercise.equipment, language) : '';
  const model = exercise ? exerciseModels[exercise.id] : undefined;
  const [mediaUnavailable, setMediaUnavailable] = useState(false);
  const [previousId, setPreviousId] = useState(id);
  if (previousId !== id) {
    setPreviousId(id);
    setMediaUnavailable(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.backRow}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={16} color={c.primary} />
          <Text style={styles.backLabel}>{t('nav.exercises')}</Text>
        </TouchableOpacity>
      </View>

      {!exercise ? (
        <EmptyState icon="alert-circle-outline" title={t('exercise.notFound')} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            {model ? (
              <ExerciseModel3D model={model} style={styles.heroMedia} />
            ) : !mediaUnavailable ? (
              <AnimatedExerciseImage
                id={exercise.id}
                animate
                style={styles.heroMedia}
                accessibilityLabel={displayName}
                onUnavailable={() => setMediaUnavailable(true)}
              />
            ) : null}
          </View>

          <View style={styles.identity}>
            <Text style={styles.kicker}>{group}</Text>
            <Text style={styles.title}>{displayName}</Text>
            <View style={styles.tags}>
              {equipment ? (
                <View style={styles.tagFilled}>
                  <Text style={styles.tagFilledText}>{equipment}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },

  backRow: {
    paddingHorizontal: 20,
  },
  backButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLabel: {
    fontFamily: fonts.serifBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    color: c.primary,
  },

  content: { paddingBottom: 32 },

  hero: {
    height: 230,
    marginTop: 8,
    backgroundColor: RAMP_WARM[300],
    overflow: 'hidden',
  },
  heroMedia: {
    flex: 1,
    borderRadius: 0,
    backgroundColor: RAMP_WARM[300],
  },

  identity: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  kicker: {
    fontFamily: fonts.serifBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.54,
    textTransform: 'uppercase',
    color: c.secondary,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    lineHeight: 34,
    marginTop: 6,
    marginBottom: 8,
    color: c.textPrimary,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagFilled: {
    backgroundColor: RAMP_WARM[200],
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  tagFilledText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: c.textPrimary,
  },
});
