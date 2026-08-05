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
  /** Nom français systématique fourni par Gemini (matching base locale). */
  nameFr?: string;
  grams: number;
}

/** Bornes de validation d'un item reconnu. */
export const MIN_GRAMS = 1;
export const MAX_GRAMS = 2000;
export const MAX_ITEMS = 12;
const MAX_NAME_LENGTH = 80;

/**
 * Prompt envoyé au VLM : IDENTIQUE à PROMPT_FINAL.txt du fine-tune v9
 * (E:\AI\trainingpicssporttracker\finetune\PROMPT_FINAL.txt) — le modèle a
 * été entraîné dessus ; toute dérive de wording dégrade la sortie.
 * Sortie JSON stricte, noms génériques EN (traduits ensuite pour le matching,
 * voir EN_TO_FR_FOOD_NAMES). Ne JAMAIS modifier sans ré-évaluer le modèle.
 */
export function buildPrompt(): string {
  return [
    'Analyze this meal photo.',
    'List each visible food item with an estimated weight in grams.',
    'Answer ONLY with valid JSON, no text before or after, in the exact format:',
    '{"items":[{"name":"rice","grams":150}]}',
    'Rules:',
    '- "name": simple generic food name in English, no brand (e.g. "rice", "chicken breast", "broccoli");',
    '- "grams": estimated weight in grams, integer between 10 and 800;',
    '- maximum 8 foods;',
    '- do not compute calories or macronutrients;',
    '- only describe what is actually visible and NEVER invent a food item;',
    '- if the image contains neither food nor drink, or if you are not reasonably sure an element is edible, answer {"items":[]};',
    '- when in doubt, answer {"items":[]} rather than guessing.',
  ].join('\n');
}

/**
 * Traduction EN → FR des noms d'aliments produits par le v9 (entraîné sur
 * labels anglais Nutrition5k) vers le vocabulaire de la base locale.
 * Clés = forme normalisée (minuscules, sans accents). Appliquée avant le
 * matching ; si absente, le nom anglais est tenté tel quel puis l'utilisateur
 * corrige manuellement.
 */
export const EN_TO_FR_FOOD_NAMES: Record<string, string> = {
  'apple': 'pomme', 'banana': 'banane', 'orange': 'orange', 'grapes': 'raisin',
  'blueberries': 'myrtilles', 'strawberries': 'fraises', 'peach': 'pêche',
  'peaches': 'pêches', 'pear': 'poire', 'melon': 'melon', 'watermelon': 'pastèque',
  'avocado': 'avocat', 'tomato': 'tomate', 'tomatoes': 'tomates',
  'cherry tomatoes': 'tomates cerises', 'cucumber': 'concombre',
  'cucumbers': 'concombres', 'carrot': 'carotte', 'carrots': 'carottes',
  'broccoli': 'brocoli', 'spinach': 'épinards', 'spinach (raw)': 'épinards crus',
  'lettuce': 'laitue', 'mixed greens': 'mesclun', 'arugula': 'roquette',
  'kale': 'chou kale', 'chard': 'blettes', 'cabbage': 'chou', 'bok choy': 'pak choï',
  'bell peppers': 'poivrons', 'pepper': 'poivre', 'onions': 'oignons',
  'onion': 'oignon', 'mushroom': 'champignon', 'mushrooms': 'champignons',
  'zucchini': 'courgette', 'squash': 'courge', 'eggplant': 'aubergine',
  'corn': 'maïs', 'peas': 'petits pois', 'green beans': 'haricots verts',
  'asparagus': 'asperges', 'cauliflower': 'chou-fleur', 'celery': 'céleri',
  'radishes': 'radis', 'beets': 'betteraves', 'potato': 'pomme de terre',
  'potatoes': 'pommes de terre', 'sweet potato': 'patate douce',
  'french fries': 'frites', 'rice': 'riz', 'white rice': 'riz blanc',
  'brown rice': 'riz complet', 'quinoa': 'quinoa', 'couscous': 'couscous',
  'millet': 'millet', 'pasta': 'pâtes', 'spaghetti': 'spaghetti',
  'noodles': 'nouilles', 'bread': 'pain', 'white bread': 'pain blanc',
  'whole wheat bread': 'pain complet', 'tortilla': 'tortilla', 'wrap': 'wrap',
  'pizza': 'pizza', 'oats': 'flocons d\u2019avoine', 'oatmeal': 'porridge',
  'cereals': 'céréales', 'granola': 'granola', 'chicken': 'poulet',
  'chicken breast': 'blanc de poulet', 'chicken thighs': 'hauts de cuisse de poulet',
  'turkey': 'dinde', 'beef': 'bœuf', 'ground beef': 'bœuf haché',
  'steak': 'steak', 'pork': 'porc', 'bacon': 'bacon', 'ham': 'jambon',
  'sausage': 'saucisse', 'salmon': 'saumon', 'tuna': 'thon', 'cod': 'cabillaud',
  'shrimp': 'crevettes', 'fish': 'poisson', 'egg': 'œuf', 'eggs': 'œufs',
  'boiled egg': 'œuf dur', 'fried egg': 'œuf au plat', 'scrambled eggs': 'œufs brouillés',
  'omelette': 'omelette', 'tofu': 'tofu', 'tempeh': 'tempeh',
  'cheese': 'fromage', 'mozzarella': 'mozzarella', 'parmesan': 'parmesan',
  'feta': 'feta', 'goat cheese': 'chèvre', 'milk': 'lait', 'yogurt': 'yaourt',
  'greek yogurt': 'yaourt grec', 'cottage cheese': 'fromage blanc',
  'butter': 'beurre', 'cream': 'crème', 'peanuts': 'cacahuètes',
  'peanut butter': 'beurre de cacahuète', 'almonds': 'amandes',
  'walnuts': 'noix', 'cashews': 'noix de cajou', 'seeds': 'graines',
  'chia seeds': 'graines de chia', 'hummus': 'houmous', 'chickpeas': 'pois chiches',
  'lentils': 'lentilles', 'beans': 'haricots', 'black beans': 'haricots noirs',
  'olive oil': 'huile d\u2019olive', 'oil': 'huile', 'vinegar': 'vinaigre',
  'honey': 'miel', 'sugar': 'sucre', 'brown sugar': 'cassonade',
  'chocolate': 'chocolat', 'candy': 'bonbons', 'cookie': 'cookie',
  'cake': 'gâteau', 'ice cream': 'glace', 'soup': 'soupe', 'sauce': 'sauce',
  'dressing': 'vinaigrette', 'caesar dressing': 'sauce césar',
  'mayonnaise': 'mayonnaise', 'ketchup': 'ketchup', 'mustard': 'moutarde',
  'soy sauce': 'sauce soja', 'salsa': 'salsa', 'guacamole': 'guacamole',
  'olives': 'olives', 'pickles': 'cornichons', 'coffee': 'café', 'tea': 'thé',
  'juice': 'jus', 'orange juice': 'jus d\u2019orange', 'soda': 'soda',
  'water': 'eau', 'wine': 'vin', 'beer': 'bière', 'smoothie': 'smoothie',
  'protein shake': 'shake protéiné', 'salmon fillet': 'pavé de saumon',
  'cauliflower rice': 'riz de chou-fleur', 'sweet potatoes': 'patates douces',
  'coconut': 'noix de coco', 'coconut milk': 'lait de coco',
  'coconut oil': 'huile de coco', 'truffle': 'truffe', 'tomatillo': 'tomatillo',
  // Compléments fréquents de Gemini (sorties observées en production)
  'mashed potatoes': 'purée', 'mashed potato': 'purée', 'potato mash': 'purée',
  'potato puree': 'purée', 'mashed': 'purée',
  'grilled chicken': 'blanc de poulet', 'roast chicken': 'poulet',
  'chicken fillet': 'blanc de poulet', 'fried chicken': 'poulet',
  'white bread slice': 'pain blanc', 'baguette': 'baguette',
  'steamed vegetables': 'légumes vapeur', 'mixed vegetables': 'légumes vapeur',
  'green salad': 'salade verte', 'tomato sauce': 'sauce tomate',
  'plain yogurt': 'yaourt', 'natural yogurt': 'yaourt',
  'cooked rice': 'riz', 'boiled rice': 'riz',
  'roast potatoes': 'pommes de terre', 'boiled potatoes': 'pommes de terre',
  'baked potato': 'pomme de terre', 'potato wedges': 'frites',
};

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
  // Déduplique par nom normalisé : le modèle boucle parfois en répétant le
  // même item jusqu'à la limite (ex. "brown rice" ×8) — on garde la 1ʳᵉ
  // occurrence, les suivantes n'apportent aucune information.
  const seen = new Set<string>();
  for (const raw of items) {
    if (result.length >= MAX_ITEMS) break;
    if (!raw || typeof raw !== 'object') continue;

    const { name, grams, name_fr } = raw as { name?: unknown; grams?: unknown; name_fr?: unknown };
    if (typeof name !== 'string') continue;
    const cleanName = name.trim().slice(0, MAX_NAME_LENGTH);
    if (!cleanName) continue;

    const norm = normalizeFoodName(cleanName);
    if (seen.has(norm)) continue;
    seen.add(norm);

    const gramsNumber = typeof grams === 'string' ? Number(grams.replace(',', '.')) : grams;
    if (typeof gramsNumber !== 'number' || !Number.isFinite(gramsNumber) || gramsNumber <= 0) {
      continue;
    }

    const cleanNameFr = typeof name_fr === 'string' ? name_fr.trim().slice(0, MAX_NAME_LENGTH) : '';
    result.push({
      name: cleanName,
      ...(cleanNameFr ? { nameFr: cleanNameFr } : {}),
      grams: clampGrams(gramsNumber),
    });
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
  // Le côté le plus court doit faire au moins 4 caractères : sinon des noms
  // très courts créent des faux positifs absurdes (« eau » ⊂ « agneau »).
  const [shorter, longer] =
    foodNorm.length <= itemNorm.length ? [foodNorm, itemNorm] : [itemNorm, foodNorm];
  if (shorter.length >= 4 && longer.includes(shorter)) {
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
export function mapItemToFood(item: Pick<MealPhotoItem, 'name' | 'nameFr'>, foods: Food[]): Food | null {
  // Priorité au name_fr fourni par Gemini (traduction faite côté modèle,
  // bien plus fiable que le dictionnaire local) ; sinon dictionnaire EN→FR ;
  // sinon le nom tel quel (déjà français avec la v9 ou Gemini en FR).
  const candidate = item.nameFr ?? item.name;
  const itemNorm = normalizeFoodName(candidate);
  if (!itemNorm) return null;
  const matchName = EN_TO_FR_FOOD_NAMES[itemNorm] ?? candidate;
  const matchNorm = normalizeFoodName(matchName);
  const itemTokens = matchNorm.split(' ');

  let best: Food | null = null;
  let bestScore = 0;

  for (const food of foods) {
    // Le test d'inclusion utilise matchNorm (nom traduit FR) : itemNorm est
    // la forme anglaise brute, qui ne peut jamais être contenue dans un nom
    // FR — comparer l'anglais rendait le bonus d'inclusion (50 pts) muet.
    const score = scoreMatch(matchNorm, itemTokens, normalizeFoodName(food.name));
    if (score > bestScore) {
      bestScore = score;
      best = food;
    }
  }

  return best;
}
