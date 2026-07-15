import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';

import { exerciseGifs } from '../../data/exercises.gifs';
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
  const styles = useMemo(() => makeStyles(c), [c]);
  const [fade] = useState(() => new Animated.Value(0));
  const frames = exerciseGifs[id] as { a?: number; b?: number } | number | undefined;
  const sourceA = typeof frames === 'number' ? frames : frames?.a;
  const sourceB = typeof frames === 'number' ? undefined : frames?.b;
  const shouldAnimate = animate && Boolean(sourceA && sourceB);

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

  if (!sourceA) return null;

  const containerStyle = [
    styles.image,
    size ? { width: size, height: size } : null,
    style,
  ];

  return (
    <View style={containerStyle}>
      <Image
        source={sourceA}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        autoplay={false}
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
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  image: { borderRadius: 8, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
});
