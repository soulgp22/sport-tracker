import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canUseMealPhoto } from '../../../lib/mealPhotoCapability';
import { mealPhotoT as mt } from '../../../i18n/mealPhotoFallback';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { fonts } from '../../../theme/fonts';
import { useTranslation } from '../../../i18n/useTranslation';
import type { MealType } from '../../../types';

type MealPhotoReviewComponent = typeof import('../../../components/nutrition/MealPhotoReview').MealPhotoReview;

function loadMealPhotoReview(): MealPhotoReviewComponent | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../../components/nutrition/MealPhotoReview') as typeof import('../../../components/nutrition/MealPhotoReview');
    return mod.MealPhotoReview;
  } catch {
    return null;
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

/**
 * Écran d'accès direct à l'analyse photo d'un repas (icône de l'accueil).
 * Ouvre immédiatement la modale VLM sur le type de repas déduit de l'heure ;
 * le type reste modifiable ensuite au moment de l'enregistrement.
 */
export default function MealPhotoScreen() {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [mealPhotoReview, setMealPhotoReview] = useState<MealPhotoReviewComponent | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let mounted = true;
    void canUseMealPhoto().then((capability) => {
      if (!mounted) return;
      if (!capability.ok) {
        setBlocked(true);
        return;
      }
      const component = loadMealPhotoReview();
      if (component) {
        setMealPhotoReview(() => component);
      } else {
        setBlocked(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as never);
    }
  };

  // Après « Tout ajouter » : atterrir sur le journal du jour pour que
  // l'utilisateur VOIE immédiatement ce qui a été enregistré.
  const goDiary = () => router.replace('/(tabs)/nutrition/diary' as never);

  if (blocked) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.blocked}>
          <Ionicons name="camera-outline" size={40} color={c.textMuted} />
          <Text style={styles.blockedText}>{mt(t, 'mealPhoto.errorMessage')}</Text>
          <TouchableOpacity onPress={goBack} hitSlop={8} activeOpacity={0.7}>
            <Text style={styles.blockedLink}>← {t('nav.nutrition')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!mealPhotoReview) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']} />;
  }

  const Review = mealPhotoReview;
  return (
    <View style={styles.host}>
      <Review
        mealType={getDefaultMealType()}
        date={todayKey()}
        onClose={goBack}
        onAdded={goDiary}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  host: { flex: 1, backgroundColor: c.bg },
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  blockedText: { fontSize: 14, fontFamily: fonts.sans, color: c.textSecondary, textAlign: 'center' },
  blockedLink: { fontSize: 14, fontFamily: fonts.sansBold, color: c.primary },
});
