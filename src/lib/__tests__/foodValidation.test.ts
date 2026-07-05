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
});
