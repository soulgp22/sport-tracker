import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';

import { buildExerciseMediaUrl } from '../../constants/exerciseMedia';
import { exerciseGifs } from '../../data/exercises.gifs';
import { exerciseMedia } from '../../data/exerciseMedia';
import { getCatalogExercise } from '../../store/exerciseCatalogStore';
import { useTranslation } from '../../i18n/useTranslation';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { radius } from '../../theme/tokens';

interface AnimatedExerciseImageProps {
  id: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  animate?: boolean;
  accessibilityLabel?: string;
  /** Appele quand aucune image n'a pu etre affichee (source absente ou echec
   *  de chargement distant). Permet au parent de masquer son cadre. */
  onUnavailable?: () => void;
}

export function AnimatedExerciseImage({
  id,
  size,
  style,
  animate = true,
  accessibilityLabel,
  onUnavailable,
}: AnimatedExerciseImageProps) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [fade] = useState(() => new Animated.Value(0));
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const enhancedMedia = exerciseMedia[id];
  const bundledSource = exerciseGifs[id];
  const catalogExercise = getCatalogExercise(id);

  // --- Remote URL: single animated WebP, fallback to default base URL ---
  const remoteWebpUrl = useMemo(() => {
    if (bundledSource) return undefined;
    return buildExerciseMediaUrl(id, catalogExercise?.remoteMediaBaseUrl);
  }, [bundledSource, catalogExercise?.remoteMediaBaseUrl, id]);

  // --- Dual-pose crossfade for bundled sources that have remote pose B ---
  const sourceA = useMemo(() => bundledSource ?? undefined, [bundledSource]);
  const shouldUseEnhancedMedia = Boolean(enhancedMedia && animate && !imageError);
  const displaySource = shouldUseEnhancedMedia
    ? { uri: enhancedMedia!.animatedUrl }
    : bundledSource
      ? bundledSource
      : remoteWebpUrl
        ? { uri: remoteWebpUrl }
        : null;

  // --- Dual-pose fade animation (only for bundled sources with remote pose B) ---
  useEffect(() => {
    if (!bundledSource) {
      fade.stopAnimation();
      fade.setValue(0);
      return;
    }

    fade.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(fade, {
          toValue: 1,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(700),
        Animated.timing(fade, {
          toValue: 0,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      fade.stopAnimation();
    };
  }, [fade, bundledSource, sourceA]);

  // --- Signale au parent l'indisponibilite du media (jamais pendant le rendu) ---
  const onUnavailableRef = useRef(onUnavailable);
  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  });

  const mediaUnavailable = !bundledSource && (imageError || !displaySource);
  useEffect(() => {
    if (mediaUnavailable) {
      onUnavailableRef.current?.();
    }
  }, [mediaUnavailable]);

  if (!displaySource && !bundledSource) {
    return (
      <View
        style={[
          styles.image,
          styles.emptyContainer,
          size ? { width: size, height: size } : null,
          style,
        ]}
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={styles.errorText}>{t('exercise.mediaError')}</Text>
      </View>
    );
  }

  const containerStyle = [
    styles.image,
    size ? { width: size, height: size } : null,
    style,
  ];

  return (
    <View style={containerStyle}>
      {/* Loading overlay for remote images */}
      {imageLoading && remoteWebpUrl && !bundledSource ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          <ActivityIndicator size="small" color={c.textSecondary} />
          <Text style={styles.overlayText}>{t('exercise.mediaLoading')}</Text>
        </View>
      ) : null}

      {/* Error overlay for failed remote images */}
      {imageError && !bundledSource ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          <Text style={styles.errorIcon}>🎬</Text>
          <Text style={styles.overlayText}>{t('exercise.mediaError')}</Text>
        </View>
      ) : null}

      {displaySource ? (
        <Image
          source={displaySource}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          autoplay={animate && Boolean(bundledSource || remoteWebpUrl)}
          cachePolicy="memory-disk"
          onLoad={() => {
            setImageLoading(false);
            setImageError(false);
          }}
          onError={() => {
            setImageLoading(false);
            setImageError(true);
          }}
          accessibilityLabel={accessibilityLabel}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    image: {
      borderRadius: radius.lg,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
    },
    overlay: {
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    overlayText: {
      color: c.textSecondary,
      fontSize: 11,
      marginTop: 6,
    },
    errorIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    errorText: {
      color: c.textMuted,
      fontSize: 12,
    },
  });
