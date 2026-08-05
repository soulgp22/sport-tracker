/**
 * Accès au serveur d'analyse repas (llama-server hébergeant le v9 GGUF).
 *
 * Le modèle ne quitte jamais le serveur : l'app envoie la photo (JPEG base64)
 * et reçoit le JSON {"items":[...]}. La clé API est embarquée côté client —
 * extractible de l'APK, mais elle ne protège que l'USAGE du serveur (révocable
 * + rotation côté serveur), pas le modèle qui reste introuvable.
 *
 * Aucune dépendance native ici : logique testable sous Jest.
 */

/** Configuration du serveur — VPS Hetzner + Caddy HTTPS (DuckDNS). */
export const MEAL_SERVER_URL = 'https://lifesporttracker.duckdns.org';
export const MEAL_SERVER_API_KEY = '<MEAL_SERVER_API_KEY-PURGED>';

const HEALTH_PATH = '/health';
// Moteur d'analyse : 'gemini' (Gemini 3.5 Flash Lite via le routeur VPS) ou
// '' pour la v9 locale (llama-server). Le routeur garde le même contrat.
const ANALYSIS_ENGINE = 'gemini';
const COMPLETIONS_PATH = `/v1/chat/completions${ANALYSIS_ENGINE ? `?engine=${ANALYSIS_ENGINE}` : ''}`;
const TRAINING_UPLOAD_PATH = '/training/submit';
const HEALTH_TIMEOUT_MS = 5000;
const ANALYSIS_TIMEOUT_MS = 60000;
const MAX_PREDICT_TOKENS = 256;

export interface MealServerRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** Construit la requête /health (sonde de disponibilité). */
export function buildHealthRequest(): { url: string } {
  return { url: `${MEAL_SERVER_URL}${HEALTH_PATH}` };
}

/**
 * Construit la requête d'analyse (format OpenAI chat/completions, image en
 * data URL base64 — attendu par llama-server multimodal).
 */
export function buildAnalysisRequest(prompt: string, jpegBase64: string, language = 'fr'): MealServerRequest {
  return {
    url: `${MEAL_SERVER_URL}${COMPLETIONS_PATH}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MEAL_SERVER_API_KEY}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${jpegBase64}` } },
          ],
        },
      ],
      max_tokens: MAX_PREDICT_TOKENS,
      temperature: 0.1,
      // Langue d'affichage des noms d'aliments (le routeur ajoute aussi un
      // name_fr systématique pour le matching avec la base locale).
      language,
    }),
  };
}

/**
 * Demande au serveur les valeurs nutritionnelles /100 g d'un aliment absent
 * de la base locale (Gemini + cache serveur, partagé entre utilisateurs).
 */
export function buildFoodInfoRequest(name: string): MealServerRequest {
  return {
    url: `${MEAL_SERVER_URL}/v1/food-info`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MEAL_SERVER_API_KEY}`,
    },
    body: JSON.stringify({ name }),
  };
}

/** Extrait le texte de la réponse OpenAI, ou null si inattendue. */
export function extractCompletionText(responseJson: unknown): string | null {
  if (!responseJson || typeof responseJson !== 'object') return null;
  const choices = (responseJson as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as { message?: { content?: unknown } };
  const content = first?.message?.content;
  return typeof content === 'string' ? content : null;
}

/**
 * Construit la requête d'envoi d'une correction annotée (roue à données) :
 * record JSON (diff modèle ↔ validation) + photo JPEG base64. Le serveur la
 * stocke telle quelle pour un futur fine-tune.
 */
export function buildTrainingUploadRequest(
  record: object,
  photoJpegBase64: string
): MealServerRequest {
  return {
    url: `${MEAL_SERVER_URL}${TRAINING_UPLOAD_PATH}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MEAL_SERVER_API_KEY}`,
    },
    body: JSON.stringify({ record, photoJpegBase64 }),
  };
}

export const MEAL_SERVER_TIMEOUTS = { HEALTH_TIMEOUT_MS, ANALYSIS_TIMEOUT_MS };
