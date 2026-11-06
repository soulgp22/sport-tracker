/**
 * Nom de l'app affiché à l'écran (Platelift depuis la 1.40.0, 2026-11-06 ;
 * auparavant « Life Sport Tracker »). Source unique pour le code : les textes
 * traduits l'écrivent en toutes lettres, et le test de marque
 * (`__tests__/brand.test.ts`) vérifie qu'aucun ne garde l'ancien nom.
 * Doit rester égal à `expo.name` dans app.json (nom sous l'icône).
 */
export const APP_NAME = 'Platelift';
