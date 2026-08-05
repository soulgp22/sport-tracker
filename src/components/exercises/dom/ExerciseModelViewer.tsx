'use dom';

import '@google/model-viewer';
import { useEffect } from 'react';

// Contournement du typage JSX pour le custom element <model-viewer>
const MV: any = 'model-viewer';

interface ExerciseModelViewerProps {
  src: string;
  /** Interceptée par le wrapper Expo (taille du webview natif), jamais reçue ici. */
  dom?: { style?: { width: number; height: number } };
}

export default function ExerciseModelViewer({ src }: ExerciseModelViewerProps) {
  useEffect(() => {
    // La page DOM d'Expo ne donne pas de hauteur à html/body/#root :
    // sans ça, tous les `height: 100%` s'effondrent à 0 et la page reste blanche.
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.background = '#000';
    const root = document.getElementById('root');
    if (root) root.style.height = '100%';
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <MV
        id="mv"
        src={src}
        camera-controls
        autoplay
        interaction-prompt="none"
        shadow-intensity="1"
        exposure="1.2"
        style={{ width: '100%', height: '100%', background: '#000' }}
      />
    </div>
  );
}
