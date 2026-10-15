import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canUseMealPhoto } from '../lib/mealPhotoCapability';
import { useMealPhotoQuota } from '../hooks/useMealPhotoQuota';
import { Paywall } from '../components/subscription/Paywall';
import { mealPhotoT as mt } from '../i18n/mealPhotoFallback';
import { useColors } from '../theme/useColors';
import type { ThemeColors } from '../theme/palettes';
import { fonts } from '../theme/fonts';
import { spacing } from '../theme/tokens';
import { useTranslation } from '../i18n/useTranslation';
import type { MealType } from '../types';

type MealPhotoReviewComponent = typeof import('../components/nutrition/MealPhotoReview').MealPhotoReview;

function loadMealPhotoReview(): MealPhotoReviewComponent | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../components/nutrition/MealPhotoReview') as typeof import('../components/nutrition/MealPhotoReview');
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
  // Quota atteint signale par l'analyse elle-meme, au moment d'en lancer une
  // nouvelle (apres « Reessayer » ou une nouvelle photo).
  const [quotaHit, setQuotaHit] = useState(false);

  // Quota lu a l'ouverture, puis tenu a jour par le serveur. « Ajouter un
  // repas » ouvre aussi l'analyse et applique le meme garde (meme hook). Le
  // serveur reste le vrai verrou : il refuse l'analyse elle-meme (HTTP 402).
  const quota = useMealPhotoQuota();

  useEffect(() => {
    if (quota.reached) return;
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
  }, [quota.reached]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as never);
    }
  };

  // Après « Tout ajouter » : atterrir sur le journal du jour pour que
  // l'utilisateur VOIE immédiatement ce qui a été enregistré.
  // Depuis une route racine, `dismissTo` ne retrouverait pas le journal dans la
  // pile (aucun écran (tabs) n'est monté) et remplacerait l'écran courant par
  // un second groupe (tabs) ; on dépile donc vers l'écran d'origine, puis on
  // navigue vers le journal.
  const goDiary = () => {
    router.back();
    router.navigate('/(tabs)/nutrition/diary' as never);
  };

  // Une fois l'analyse ouverte, le quota qui bascule ne doit pas la remplacer :
  // chaque analyse reussie compte, et c'est justement la derniere autorisee qui
  // le fait basculer. Son resultat reste a l'ecran ; l'offre n'apparait qu'a la
  // tentative suivante, quand l'analyse la signale (onQuotaExceeded).
  const sessionStarted = mealPhotoReview !== null;

  // Quota atteint a l'ouverture : on l'annonce AVANT de charger le module
  // d'analyse, pour ne pas laisser croire que la camera va s'ouvrir. Palier
  // gratuit : l'offre d'abonnement, avec son contexte. Apres l'achat, le palier
  // passe a « premium » et l'analyse s'ouvre d'elle-meme.
  if (quota.reached && quota.tier === 'free' && (!sessionStarted || quotaHit)) {
    return <Paywall reason="quota" onClose={goBack} />;
  }

  // Abonne a 100 analyses : rien a vendre, la limite revient demain.
  if (quota.reached && !sessionStarted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.blocked}>
          <Ionicons name="lock-closed-outline" size={40} color={c.textMuted} />
          <Text style={styles.quotaTitle}>{t('mealPhoto.quotaTitle')}</Text>
          <Text style={styles.blockedText}>
            {t('mealPhoto.quotaMessage', { limit: quota.limit })}
          </Text>
          <TouchableOpacity onPress={goBack} hitSlop={8} activeOpacity={0.7}>
            <Text style={styles.blockedLink}>← {t('nav.nutrition')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        // Garde de l'analyse (quota atteint avant une nouvelle analyse, ou
        // refus 402 du serveur) : l'offre remplace alors l'ecran.
        onQuotaExceeded={() => setQuotaHit(true)}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  host: { flex: 1, backgroundColor: c.bg },
  blocked: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  blockedText: { fontSize: 14, fontFamily: fonts.sans, color: c.textSecondary, textAlign: 'center' },
  quotaTitle: { fontSize: 20, fontFamily: fonts.serifBold, color: c.textPrimary, textAlign: 'center' },
  blockedLink: { fontSize: 14, fontFamily: fonts.sansBold, color: c.primary },
});
