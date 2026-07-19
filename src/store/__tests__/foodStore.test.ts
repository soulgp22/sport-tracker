import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Food } from '../../types';
import { useFoodStore } from '../foodStore';

function makeFood(overrides: Partial<Food> = {}): Food {
  return {
    id: 'custom_yaourt_epais',
    name: 'Yaourt Épais',
    category: 'Produits laitiers',
    unit: 'g',
    nutritionPer100g: { calories: 90, protein: 8, carbs: 5, fat: 4 },
    isCustom: true,
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  useFoodStore.setState({ customFoods: [] });
});

describe('foodStore', () => {
  it('ajoute, met à jour et supprime un aliment personnalisé', () => {
    const store = useFoodStore.getState();
    const food = makeFood();

    store.addCustomFood(food);
    expect(useFoodStore.getState().getCustomFoods()).toEqual([food]);

    useFoodStore.getState().updateCustomFood(food.id, { name: 'Yaourt grec maison' });
    expect(useFoodStore.getState().getFoodById(food.id)?.name).toBe('Yaourt grec maison');

    useFoodStore.getState().deleteCustomFood(food.id);
    expect(useFoodStore.getState().getCustomFoods()).toEqual([]);
  });

  it('supprime plusieurs aliments personnalisés en une seule opération', () => {
    const first = makeFood({ id: 'custom_1', name: 'Premier' });
    const second = makeFood({ id: 'custom_2', name: 'Deuxième' });
    const third = makeFood({ id: 'custom_3', name: 'Troisième' });
    const store = useFoodStore.getState();

    store.addCustomFood(first);
    store.addCustomFood(second);
    store.addCustomFood(third);

    const deleted = useFoodStore.getState().deleteCustomFoods(['custom_1', 'custom_3', 'riz_cuit']);

    expect(deleted).toBe(2);
    expect(useFoodStore.getState().getCustomFoods()).toEqual([second]);
    expect(useFoodStore.getState().getFoodById('riz_cuit')).toBeDefined();
  });

  it('cherche par nom sans tenir compte de la casse ni des accents', () => {
    useFoodStore.getState().addCustomFood(makeFood());

    const results = useFoodStore.getState().searchFoods('EPAIS');

    expect(results.some((food) => food.id === 'custom_yaourt_epais')).toBe(true);
  });

  it('filtre les aliments par catégorie', () => {
    useFoodStore.getState().addCustomFood(makeFood({ category: 'Tests' }));

    const results = useFoodStore.getState().filterFoodsByCategory('Tests');

    expect(results).toHaveLength(1);
    expect(results[0].category).toBe('Tests');
  });

  it('fusionne les aliments par défaut et personnalisés', () => {
    const defaultFoods = useFoodStore.getState().getDefaultFoods();
    useFoodStore.getState().addCustomFood(makeFood());

    const allFoods = useFoodStore.getState().getAllFoods();

    expect(defaultFoods.length).toBeGreaterThanOrEqual(120);
    expect(allFoods).toHaveLength(defaultFoods.length + 1);
    expect(allFoods.some((food) => food.id === 'riz_cuit')).toBe(true);
    expect(allFoods.some((food) => food.id === 'custom_yaourt_epais')).toBe(true);
  });

  it('expose les catégories triées', () => {
    useFoodStore.getState().addCustomFood(makeFood({ category: 'Tests' }));

    expect(useFoodStore.getState().getCategories()).toContain('Féculents');
    expect(useFoodStore.getState().getCategories()).toContain('Tests');
  });

  it('importe les aliments valides et remonte doublons et erreurs', () => {
    const payload = JSON.stringify([
      makeFood({ id: 'custom_barre_maison', name: 'Barre maison', category: 'Snacks/Sucré' }),
      makeFood({ id: 'riz_cuit', name: 'Riz doublon' }),
      makeFood({
        id: 'aliment_invalide',
        name: 'Aliment invalide',
        nutritionPer100g: { calories: -10, protein: 1, carbs: 1, fat: 1 },
      }),
    ]);

    const result = useFoodStore.getState().importFoods(payload);

    expect(result.added).toBe(1);
    expect(result.duplicateIds).toEqual(['riz_cuit']);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(useFoodStore.getState().getCustomFoods().map((food) => food.id)).toContain('custom_barre_maison');
    expect(useFoodStore.getState().getCustomFoods().map((food) => food.id)).not.toContain('riz_cuit');
  });

  it('ignore un aliment importé dont le barcode existe déjà (doublon par barcode)', () => {
    // First, add a food with a known barcode
    useFoodStore.getState().addCustomFood(
      makeFood({ id: 'custom_nutella_fr', name: 'Nutella France', barcode: '3017620425035' }),
    );

    const payload = JSON.stringify([
      makeFood({ id: 'custom_nutella_be', name: 'Nutella Belgique', barcode: '3017620425035' }),
      makeFood({ id: 'custom_coca_be', name: 'Coca-Cola Belgique', barcode: '5449000000996' }),
    ]);

    const result = useFoodStore.getState().importFoods(payload);

    expect(result.added).toBe(1);
    expect(result.duplicateIds).toContain('custom_nutella_be');
    expect(useFoodStore.getState().getCustomFoods().map((f) => f.id)).toContain('custom_nutella_fr');
    expect(useFoodStore.getState().getCustomFoods().map((f) => f.id)).toContain('custom_coca_be');
    expect(useFoodStore.getState().getCustomFoods().map((f) => f.id)).not.toContain('custom_nutella_be');
  });

  it('importe deux bases pays successives sans doublon produit (même barcode)', () => {
    // Import base France
    const francePayload = JSON.stringify([
      makeFood({ id: 'off_france_3017620425035', name: 'Nutella', barcode: '3017620425035' }),
      makeFood({ id: 'off_france_5449000000996', name: 'Coca-Cola', barcode: '5449000000996' }),
    ]);
    const resultFrance = useFoodStore.getState().importFoods(francePayload);
    expect(resultFrance.added).toBe(2);
    expect(useFoodStore.getState().getCustomFoods()).toHaveLength(2);

    // Import base Belgique — même barcodes, IDs différents
    const belgiquePayload = JSON.stringify([
      makeFood({ id: 'off_belgique_3017620425035', name: 'Nutella BE', barcode: '3017620425035' }),
      makeFood({ id: 'off_belgique_9990000000001', name: 'Produit unique BE', barcode: '9990000000001' }),
    ]);
    const resultBelgique = useFoodStore.getState().importFoods(belgiquePayload);

    // Only the unique product should be added
    expect(resultBelgique.added).toBe(1);
    expect(resultBelgique.duplicateIds).toContain('off_belgique_3017620425035');
    expect(useFoodStore.getState().getCustomFoods()).toHaveLength(3);
    expect(useFoodStore.getState().getCustomFoods().map((f) => f.id)).toContain('off_belgique_9990000000001');
    expect(useFoodStore.getState().getCustomFoods().map((f) => f.id)).not.toContain('off_belgique_3017620425035');
  });

  it("n'affecte pas les aliments sans barcode lors de la déduplication barcode", () => {
    useFoodStore.getState().addCustomFood(
      makeFood({ id: 'existing_with_barcode', barcode: '1234567890123' }),
    );

    const payload = JSON.stringify([
      makeFood({ id: 'no_barcode_food', name: 'Sans code-barres' }),
    ]);

    const result = useFoodStore.getState().importFoods(payload);

    expect(result.added).toBe(1);
    expect(result.duplicateIds).toEqual([]);
    expect(useFoodStore.getState().getCustomFoods().map((f) => f.id)).toContain('no_barcode_food');
  });

  it('reconnaît un barcode avec espaces parasites comme doublon à l import', () => {
    useFoodStore.getState().addCustomFood(
      makeFood({ id: 'existing_nutella', barcode: '3017620425035' }),
    );

    const payload = JSON.stringify([
      makeFood({ id: 'spaces_test', name: 'Avec espaces', barcode: ' 3017620425035 ' }),
    ]);

    const result = useFoodStore.getState().importFoods(payload);

    expect(result.added).toBe(0);
    expect(result.duplicateIds).toContain('spaces_test');
    expect(useFoodStore.getState().getCustomFoods()).toHaveLength(1);
  });
});
