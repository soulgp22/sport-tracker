import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Asset } from 'expo-asset';

import ExerciseModelViewer from './dom/ExerciseModelViewer';

interface ExerciseModel3DProps {
  /** Module asset (require('../../assets/models/xxx.glb')) */
  model: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Viewer 3D via Expo DOM component : le <model-viewer> web est servi par
 * Metro en HTTP (fini les blocages file:// de la WebView Android).
 *
 * NB : un DOM component SANS dimensions explicites mesure 0×0 (le JS tourne
 * mais la webview native n'affiche rien). On mesure donc le conteneur via
 * onLayout et on passe une taille numérique au composant DOM.
 */
export function ExerciseModel3D({ model, style }: ExerciseModel3DProps) {
  // En dev, .uri est une URL Metro http://… joignable par la webview DOM.
  const uri = Asset.fromModule(model).uri;
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (size?.width !== width || size?.height !== height)) {
      setSize({ width, height });
    }
  };

  // La prop `dom` doit garder une identité stable entre les rendus :
  // un objet recréé à chaque render force Expo à re-configurer la webview
  // native (rechargement inutile du <model-viewer>).
  const dom = useMemo(
    () => (size ? { style: { width: size.width, height: size.height } } : undefined),
    [size],
  );

  return (
    <View style={[styles.container, style]} onLayout={onLayout}>
      {size ? (
        <ExerciseModelViewer
          src={uri}
          // La taille du webview natif passe par la prop `dom` (interceptée
          // par le wrapper Expo, non envoyée au composant web).
          dom={dom}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
});
