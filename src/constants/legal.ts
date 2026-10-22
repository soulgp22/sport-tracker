import { MEAL_SERVER_URL } from '../lib/mealPhotoApi';

/**
 * Pages legales, servies par le VPS (Caddy, /opt/meal-training/www). Meme
 * domaine que l'API : il est deja public (EXPO_PUBLIC_MEAL_SERVER_URL).
 * Sources : docs/play-store/POLITIQUE_CONFIDENTIALITE.md et
 * docs/play-store/CONDITIONS_ABONNEMENT.md.
 */
export const PRIVACY_POLICY_URL = MEAL_SERVER_URL ? `${MEAL_SERVER_URL}/privacy` : '';
export const SUBSCRIPTION_TERMS_URL = MEAL_SERVER_URL ? `${MEAL_SERVER_URL}/terms` : '';

/** Page Google Play de gestion des abonnements, repli si le fournisseur n'en donne pas. */
export const PLAY_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions?package=com.sportracker.app';
