import { validateFoodsJson } from '../foodValidation';

const validFood = {
  id: 'pain_test',
  name: 'Pain test',
  category: 'Féculents',
  unit: 'g',
  nutritionPer100g: { calories: 250, protein: 8, carbs: 50, fat: 2 },
};

describe('validateFoodsJson', () => {
  it('remonte une erreur pour un JSON invalide', () => {
    const result = validateFoodsJson('{bad json');

    expect(result.foods).toEqual([]);
    expect(result.errors[0]).toContain('JSON invalide');
  });

  it('remonte une erreur pour un champ requis manquant', () => {
    const result = validateFoodsJson(JSON.stringify([{ ...validFood, name: undefined }]));

    expect(result.foods).toEqual([]);
    expect(result.errors.some((error) => error.includes('name'))).toBe(true);
  });

  it('remonte une erreur pour des calories négatives', () => {
    const result = validateFoodsJson(
      JSON.stringify([{ ...validFood, nutritionPer100g: { ...validFood.nutritionPer100g, calories: -1 } }])
    );

    expect(result.foods).toEqual([]);
    expect(result.errors.some((error) => error.includes('calories'))).toBe(true);
  });

  it('signale les doublons d id', () => {
    const result = validateFoodsJson(JSON.stringify([{ ...validFood }, { ...validFood, name: 'Pain bis' }]));

    expect(result.foods).toEqual([]);
    expect(result.duplicateIds).toEqual(['pain_test']);
    expect(result.errors.some((error) => error.includes('déjà utilisé'))).toBe(true);
  });

  it('signale les doublons face aux ids existants', () => {
    const result = validateFoodsJson(JSON.stringify([validFood]), ['pain_test']);

    expect(result.foods).toEqual([]);
    expect(result.duplicateIds).toEqual(['pain_test']);
  });

  it('retourne les aliments valides avec isCustom forcé à true', () => {
    const result = validateFoodsJson(JSON.stringify({ foods: [validFood] }));

    expect(result.errors).toEqual([]);
    expect(result.duplicateIds).toEqual([]);
    expect(result.foods).toEqual([{ ...validFood, isCustom: true }]);
  });

  it('préserve les métadonnées étendues Open Food Facts', () => {
    const extendedFood = {
      ...validFood,
      brand: 'Marque test',
      retailer: 'Carrefour',
      country: 'France',
      barcode: '3017620425035',
      sourceUrl: 'https://world.openfoodfacts.org/product/3017620425035',
    };

    const result = validateFoodsJson(JSON.stringify({ foods: [extendedFood] }));

    expect(result.errors).toEqual([]);
    expect(result.foods).toEqual([{ ...extendedFood, isCustom: true }]);
  });

  it('ignore un aliment dont le barcode existe déjà (doublon par barcode)', () => {
    const result = validateFoodsJson(
      JSON.stringify([{ ...validFood, id: 'off_belgique_123', barcode: '3017620425035' }]),
      [],
      ['3017620425035'],
    );

    expect(result.foods).toEqual([]);
    expect(result.duplicateIds).toEqual(['off_belgique_123']);
  });

  it('déduplique par barcode entre deux imports pays successifs', () => {
    // Simuler un premier import (France) déjà présent avec un barcode
    const existingIds = ['off_france_3017620425035'];
    const existingBarcodes = ['3017620425035'];

    // Second import (Belgique) : même barcode mais ID différent
    const result = validateFoodsJson(
      JSON.stringify([
        { ...validFood, id: 'off_belgique_3017620425035', name: 'Nutella', barcode: '3017620425035' },
        { ...validFood, id: 'off_belgique_5449000000996', name: 'Coca-Cola', barcode: '5449000000996' },
      ]),
      existingIds,
      existingBarcodes,
    );

    expect(result.foods).toHaveLength(1);
    expect(result.foods[0].id).toBe('off_belgique_5449000000996');
    expect(result.duplicateIds).toEqual(['off_belgique_3017620425035']);
  });

  it("n'affecte pas les aliments sans barcode (dédup par id uniquement)", () => {
    const result = validateFoodsJson(
      JSON.stringify([{ ...validFood, id: 'sans_barcode', name: 'Sans barcode' }]),
      ['autre_id'],
      ['1234567890123'],
    );

    expect(result.foods).toHaveLength(1);
    expect(result.foods[0].id).toBe('sans_barcode');
    expect(result.duplicateIds).toEqual([]);
  });

  it('reconnaît un barcode avec espaces parasites comme doublon', () => {
    const result = validateFoodsJson(
      JSON.stringify([{ ...validFood, id: 'espaces_test', barcode: ' 3017620425035 ' }]),
      [],
      ['3017620425035'],
    );

    expect(result.foods).toEqual([]);
    expect(result.duplicateIds).toEqual(['espaces_test']);
  });

  it('reconnaît un barcode en doublon interne au fichier (même fichier, deux ids)', () => {
    const result = validateFoodsJson(
      JSON.stringify([
        { ...validFood, id: 'first', name: 'Premier', barcode: '9990000000001' },
        { ...validFood, id: 'second', name: 'Second', barcode: '9990000000001' },
      ]),
    );

    expect(result.foods).toEqual([]);
    expect(result.duplicateIds).toContain('first');
    expect(result.duplicateIds).toContain('second');
  });
});
