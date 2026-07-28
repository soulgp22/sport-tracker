import type { Food } from '../../types';
import {
  MAX_GRAMS,
  MAX_ITEMS,
  MIN_GRAMS,
  buildPrompt,
  mapItemToFood,
  normalizeFoodName,
  parseModelOutput,
} from '../mealPhotoAi';

function makeFood(id: string, name: string): Food {
  return {
    id,
    name,
    category: 'Divers',
    unit: 'g',
    nutritionPer100g: { calories: 100, protein: 5, carbs: 10, fat: 2 },
    isCustom: false,
  };
}

const FOODS: Food[] = [
  makeFood('riz_cuit', 'Riz cuit'),
  makeFood('riz_complet', 'Riz complet cuit'),
  makeFood('poulet', 'Blanc de poulet'),
  makeFood('brocoli', 'Brocoli cuit vapeur'),
  makeFood('oeuf_dur', 'Oeuf dur'),
  makeFood('pomme', 'Pomme'),
];

describe('buildPrompt', () => {
  it('demande une sortie JSON stricte avec le format items/name/grams', () => {
    const prompt = buildPrompt();
    expect(prompt).toContain('{"items":[{"name":"riz","grams":150}]}');
    expect(prompt).toContain('UNIQUEMENT');
    expect(prompt).toContain('JSON');
  });

  it('interdit le calcul de macros et impose des noms génériques en français', () => {
    const prompt = buildPrompt();
    expect(prompt).toContain('français');
    expect(prompt).toMatch(/ne calcule ni calories ni macronutriments/i);
  });

  it('ordonne {"items":[]} pour une image sans nourriture ou incertaine', () => {
    const prompt = buildPrompt();
    expect(prompt).toContain('{"items":[]}');
    expect(prompt).toMatch(/ni nourriture ni boisson/i);
    expect(prompt).toMatch(/raisonnablement sûr/i);
  });

  it('interdit explicitement d\'inventer un aliment', () => {
    const prompt = buildPrompt();
    expect(prompt).toMatch(/n'invente JAMAIS/i);
    expect(prompt).toMatch(/plutôt que de deviner/i);
  });
});

describe('parseModelOutput', () => {
  it('parse un JSON propre', () => {
    const items = parseModelOutput('{"items":[{"name":"riz","grams":150}]}');
    expect(items).toEqual([{ name: 'riz', grams: 150 }]);
  });

  it('tolère le JSON entouré de balises markdown', () => {
    const text = 'Voici le résultat :\n```json\n{"items":[{"name":"poulet","grams":120}]}\n```\nMerci !';
    expect(parseModelOutput(text)).toEqual([{ name: 'poulet', grams: 120 }]);
  });

  it('tolère du texte avant et après le JSON', () => {
    const text = 'Bien sûr ! {"items":[{"name":"brocoli","grams":80},{"name":"riz","grams":200}]} Fin.';
    expect(parseModelOutput(text)).toEqual([
      { name: 'brocoli', grams: 80 },
      { name: 'riz', grams: 200 },
    ]);
  });

  it('retourne [] pour une sortie sans JSON exploitable', () => {
    expect(parseModelOutput('')).toEqual([]);
    expect(parseModelOutput('aucun aliment visible')).toEqual([]);
    expect(parseModelOutput('{items: [invalid')).toEqual([]);
    expect(parseModelOutput('{"result": 42}')).toEqual([]);
    expect(parseModelOutput('{"items":"riz"}')).toEqual([]);
  });

  it('retourne [] pour une entrée non textuelle', () => {
    expect(parseModelOutput(null as unknown as string)).toEqual([]);
    expect(parseModelOutput(undefined as unknown as string)).toEqual([]);
  });

  it('ignore les items sans nom valide ou sans grammes valides', () => {
    const text = JSON.stringify({
      items: [
        { name: 'riz', grams: 100 },
        { name: '', grams: 50 },
        { name: '   ', grams: 50 },
        { name: 'poulet', grams: 'abc' },
        { name: 'poulet', grams: -10 },
        { name: 'poulet', grams: 0 },
        { name: 'poulet' },
        { grams: 100 },
        'pas un objet',
        null,
        { name: 'brocoli', grams: 90 },
      ],
    });
    expect(parseModelOutput(text)).toEqual([
      { name: 'riz', grams: 100 },
      { name: 'brocoli', grams: 90 },
    ]);
  });

  it('borne les grammes entre MIN_GRAMS et MAX_GRAMS et arrondit', () => {
    const text = JSON.stringify({
      items: [
        { name: 'sel', grams: 0.4 },
        { name: 'riz', grams: 150.6 },
        { name: 'plat géant', grams: 99999 },
      ],
    });
    expect(parseModelOutput(text)).toEqual([
      { name: 'sel', grams: MIN_GRAMS },
      { name: 'riz', grams: 151 },
      { name: 'plat géant', grams: MAX_GRAMS },
    ]);
  });

  it('accepte les grammes fournis en chaîne de caractères', () => {
    expect(parseModelOutput('{"items":[{"name":"riz","grams":"150"}]}')).toEqual([
      { name: 'riz', grams: 150 },
    ]);
  });

  it('plafonne à MAX_ITEMS items', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ name: `aliment ${i}`, grams: 100 }));
    const items = parseModelOutput(JSON.stringify({ items: many }));
    expect(items).toHaveLength(MAX_ITEMS);
    expect(items[0].name).toBe('aliment 0');
  });

  it('accepte un tableau d\'items vide', () => {
    expect(parseModelOutput('{"items":[]}')).toEqual([]);
  });

  it('{"items":[]} est une sortie valide (image sans nourriture) et donne zéro item', () => {
    // Réponse attendue du prompt pour une photo non alimentaire (ex. un
    // ventilateur) : elle doit être acceptée telle quelle, sans erreur.
    const items = parseModelOutput('{"items":[]}');
    expect(items).toEqual([]);
    expect(items).toHaveLength(0);
  });
});

describe('normalizeFoodName', () => {
  it('minuscules, accents et ponctuation neutralisés', () => {
    expect(normalizeFoodName('  Riz Cuit! ')).toBe('riz cuit');
    expect(normalizeFoodName('Crème brûlée')).toBe('creme brulee');
    expect(normalizeFoodName('Œuf brouillé')).toBe('oeuf brouille');
  });
});

describe('mapItemToFood', () => {
  it('matche un nom identique malgré casse et accents', () => {
    expect(mapItemToFood({ name: 'RIZ CUIT' }, FOODS)?.id).toBe('riz_cuit');
    expect(mapItemToFood({ name: 'œuf dur' }, FOODS)?.id).toBe('oeuf_dur');
  });

  it('matche par inclusion de tokens', () => {
    expect(mapItemToFood({ name: 'poulet' }, FOODS)?.id).toBe('poulet');
    expect(mapItemToFood({ name: 'blanc de poulet grillé' }, FOODS)?.id).toBe('poulet');
    expect(mapItemToFood({ name: 'brocoli vapeur' }, FOODS)?.id).toBe('brocoli');
  });

  it('préfère le match exact au match partiel', () => {
    const foods = [makeFood('riz_complet', 'Riz complet cuit'), makeFood('riz', 'Riz')];
    expect(mapItemToFood({ name: 'riz' }, foods)?.id).toBe('riz');
  });

  it('choisit le meilleur score parmi plusieurs candidats', () => {
    // "riz complet" matche mieux "Riz complet cuit" (2 tokens) que "Riz cuit" (1 token).
    expect(mapItemToFood({ name: 'riz complet' }, FOODS)?.id).toBe('riz_complet');
  });

  it('retourne null quand aucun aliment ne matche', () => {
    expect(mapItemToFood({ name: 'sushi au thon' }, FOODS)).toBeNull();
    expect(mapItemToFood({ name: '   ' }, FOODS)).toBeNull();
    expect(mapItemToFood({ name: 'pomme' }, [])).toBeNull();
  });

  it('matche malgré les accents du côté de la base locale', () => {
    const foods = [makeFood('puree', 'Purée de pommes de terre')];
    expect(mapItemToFood({ name: 'puree' }, foods)?.id).toBe('puree');
  });
});
