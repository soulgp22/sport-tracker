import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';

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
  const [failedMediaId, setFailedMediaId] = useState<string | null>(null);
  const enhancedMedia = exerciseMedia[id];
  const bundledSource = exerciseGifs[id];
  const catalogExercise = getCatalogExercise(id);
  const remoteBase = catalogExercise?.remoteMediaBaseUrl;
  const sourceA = useMemo(() => bundledSource ?? (remoteBase && catalogExercise
    ? { uri: `${remoteBase}${catalogExercise.gif.a}` }
    : undefined), [bundledSource, catalogExercise, remoteBase]);
  const sourceB = useMemo(() => !bundledSource && remoteBase && catalogExercise
    ? { uri: `${remoteBase}${catalogExercise.gif.b}` }
    : undefined, [bundledSource, catalogExercise, remoteBase]);
  const shouldAnimate = animate && Boolean(sourceA && sourceB);
  const shouldUseEnhancedMedia = Boolean(enhancedMedia && animate && failedMediaId !== id);

  useEffect(() => {
    if (!shouldAnimate) {
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
  }, [fade, shouldAnimate, sourceA, sourceB]);

  if (!sourceA && !enhancedMedia) return null;

  const containerStyle = [
    styles.image,
    size ? { width: size, height: size } : null,
    style,
  ];

  return (
    <View style={containerStyle}>
      {shouldUseEnhancedMedia && enhancedMedia ? (
        <Image
          source={{ uri: enhancedMedia.animatedUrl }}
          placeholder={enhancedMedia.posterUrl ? { uri: enhancedMedia.posterUrl } : sourceA}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          autoplay
          cachePolicy="memory-disk"
          transition={180}
          onError={() => setFailedMediaId(id)}
          accessibilityLabel={accessibilityLabel}
        />
      ) : (
        <>
          <Image
            source={sourceA}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            autoplay={animate && Boolean(bundledSource)}
            cachePolicy="memory-disk"
            accessibilityLabel={accessibilityLabel}
          />
          {shouldAnimate && sourceB ? (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade }]}>
              <Image
                source={sourceB}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                autoplay={false}
                accessible={false}
              />
            </Animated.View>
          ) : null}
        </>
      )}
      {animate ? (
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  image: { borderRadius: 8, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
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
