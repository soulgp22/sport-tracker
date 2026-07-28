/**
 * Logique pure du spike « estimation de repas par photo ».
 *
 * Le VLM (on-device) ne calcule JAMAIS les macros : il produit une liste
 * structurée d'aliments avec grammes estimés. L'app matche ensuite chaque
 * item avec sa base locale (foodStore / nutritionPer100g) qui fait le calcul
 * exact, et l'utilisateur corrige avant enregistrement.
 *
 * Aucune dépendance native ici : module 100 % testable sous Jest.
 */

import type { Food } from '../types';

export interface MealPhotoItem {
  name: string;
  grams: number;
}

/** Bornes de validation d'un item reconnu. */
export const MIN_GRAMS = 1;
export const MAX_GRAMS = 2000;
export const MAX_ITEMS = 12;
const MAX_NAME_LENGTH = 80;

/**
 * Prompt envoyé au VLM : sortie JSON stricte, en français, noms génériques.
 * Le modèle ne doit rien calculer, seulement décrire.
 */
export function buildPrompt(): string {
  return [
    'Analyse cette photo de repas.',
    'Liste chaque aliment visible avec une estimation de son poids en grammes.',
    'Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, au format exact :',
    '{"items":[{"name":"riz","grams":150}]}',
    'Règles :',
    '- "name" : nom simple et générique de l\'aliment, en français, sans marque (ex. "riz", "blanc de poulet", "brocoli") ;',
    '- "grams" : poids estimé en grammes, nombre entier entre 10 et 800 ;',
    '- maximum 8 aliments ;',
    '- ne calcule ni calories ni macronutriments ;',
    '- si aucun aliment n\'est visible, réponds {"items":[]}.',
  ].join('\n');
}

/** Extrait le premier objet JSON `{...}` d'un texte, même entouré de markdown. */
function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Cas idéal : le texte entier est du JSON.
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // Sinon : prendre la sous-chaîne entre la première '{'
  // et la dernière '}' (tolère ```json ... ``` et le baratin autour).
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function clampGrams(value: number): number {
  return Math.min(MAX_GRAMS, Math.max(MIN_GRAMS, Math.round(value)));
}

/**
 * Parse la sortie brute du modèle en liste d'items validés.
 * Repli gracieux : retourne [] dès que rien d'exploitable n'est trouvé,
 * ne lève jamais d'erreur.
 */
export function parseModelOutput(text: string): MealPhotoItem[] {
  if (typeof text !== 'string') return [];

  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== 'object') return [];

  const items = (parsed as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  const result: MealPhotoItem[] = [];
  for (const raw of items) {
    if (result.length >= MAX_ITEMS) break;
    if (!raw || typeof raw !== 'object') continue;

    const { name, grams } = raw as { name?: unknown; grams?: unknown };
    if (typeof name !== 'string') continue;
    const cleanName = name.trim().slice(0, MAX_NAME_LENGTH);
    if (!cleanName) continue;

    const gramsNumber = typeof grams === 'string' ? Number(grams.replace(',', '.')) : grams;
    if (typeof gramsNumber !== 'number' || !Number.isFinite(gramsNumber) || gramsNumber <= 0) {
      continue;
    }

    result.push({ name: cleanName, grams: clampGrams(gramsNumber) });
  }

  return result;
}

/** Normalisation accents/casse/ponctuation pour le matching (œ → oe, æ → ae). */
export function normalizeFoodName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreMatch(itemNorm: string, itemTokens: string[], foodNorm: string): number {
  if (!itemNorm || !foodNorm) return 0;
  if (foodNorm === itemNorm) return 1000;

  let score = 0;
  // Nom de l'item contenu tel quel dans le nom de l'aliment (ou l'inverse).
  if (foodNorm.includes(itemNorm) || itemNorm.includes(foodNorm)) {
    score += 50;
  }

  const foodTokens = foodNorm.split(' ');
  for (const token of itemTokens) {
    if (foodTokens.includes(token)) {
      score += 10;
    } else if (token.length >= 4 && foodNorm.includes(token)) {
      // Inclusion partielle (pluriels, accords) pour les tokens assez longs.
      score += 5;
    }
  }

  return score;
}

/**
 * Matche un item reconnu avec la base locale d'aliments.
 * Retourne le meilleur Food, ou null si aucun score positif
 * (l'utilisateur pourra alors chercher manuellement).
 */
export function mapItemToFood(item: Pick<MealPhotoItem, 'name'>, foods: Food[]): Food | null {
  const itemNorm = normalizeFoodName(item.name);
  if (!itemNorm) return null;
  const itemTokens = itemNorm.split(' ');

  let best: Food | null = null;
  let bestScore = 0;

  for (const food of foods) {
    const score = scoreMatch(itemNorm, itemTokens, normalizeFoodName(food.name));
    if (score > bestScore) {
      bestScore = score;
      best = food;
    }
  }

  return best;
}
