import { useEffect, useMemo, useState } from 'react';
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

interface AnimatedExerciseImageProps {
  id: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  animate?: boolean;
  accessibilityLabel?: string;
}

export function AnimatedExerciseImage({
  id,
  size,
  style,
  animate = true,
  accessibilityLabel,
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

      {animate && !imageError && !imageLoading && displaySource ? (
        <View pointerEvents="none" style={styles.motionBadge}>
          <Text style={styles.motionBadgeText}>
            {shouldUseEnhancedMedia
              ? t('exercise.mediaEnhanced')
              : `${t('exercise.start')} ↔ ${t('exercise.finish')}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    image: {
      borderRadius: 8,
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
    motionBadge: {
      position: 'absolute',
      right: 8,
      bottom: 8,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: c.overlay,
    },
    motionBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
  });
