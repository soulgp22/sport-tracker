// Point d'entree JS. Remplace `"main": "expo-router/entry"` dans package.json
// pour enregistrer, en plus de l'app, le gestionnaire du widget Android
// (react-native-android-widget) : le launcher l'appelle en JS headless, sans
// ecran, quand un widget est ajoute ou rafraichi.
import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { dailyGoalsWidgetTaskHandler } from './src/lib/widgets/dailyGoalsWidget';

registerWidgetTaskHandler(dailyGoalsWidgetTaskHandler);
