import { Redirect } from 'expo-router';

// L'écran Historique a fusionné avec Progression (désormais « Stats ») : les
// anciens liens profonds et notifications pointant vers /history continuent de
// fonctionner en redirigeant vers l'onglet Séances du nouvel écran unique.
export default function HistoryScreen() {
  return <Redirect href="/(tabs)/progress?tab=sessions" />;
}

