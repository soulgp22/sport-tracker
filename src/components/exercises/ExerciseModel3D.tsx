import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystemLegacy from 'expo-file-system/legacy';

import ExerciseModelViewer from './dom/ExerciseModelViewer';

interface ExerciseModel3DProps {
  /** Module asset (require('../../assets/models/xxx.glb')) */
  model: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Viewer 3D via Expo DOM component (<model-viewer> dans une webview).
 *
 * Le GLB est embarqué en data-URI base64 : en build de production, la page
 * DOM est servie en file:// et la WebView Android bloque les requêtes
 * file:// secondaires — le modèle ne se chargeait jamais (écran noir).
 * La data-URI fonctionne à l'identique en dev et en production.
 *
 * NB : un DOM component SANS dimensions explicites mesure 0×0 (le JS tourne
 * mais la webview native n'affiche rien). On mesure donc le conteneur via
 * onLayout et on passe une taille numérique au composant DOM.
 */
export function ExerciseModel3D({ model, style }: ExerciseModel3DProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const asset = Asset.fromModule(model);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
          encoding: 'base64',
        });
        if (!cancelled) setSrc(`data:model/gltf-binary;base64,${base64}`);
      } catch {
        // Échec de lecture de l'asset : le conteneur noir reste affiché,
        // l'écran de détail exercice reste utilisable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [model]);

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
      {size && src ? (
        <ExerciseModelViewer
          src={src}
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
