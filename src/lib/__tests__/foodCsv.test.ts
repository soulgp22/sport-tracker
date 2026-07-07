import { parseFoodsCsv } from '../foodCsv';

describe('parseFoodsCsv', () => {
  it('parse un CSV avec séparateur point-virgule et en-têtes FR', () => {
    const result = parseFoodsCsv(
      [
        'nom;categorie;unite;calories;proteines;glucides;lipides',
        'Yaourt grec 0%;Produits laitiers;g;59;10;3.6;0.4',
        'Pain complet;Féculents;g;250;9;41;4.2',
      ].join('\n')
    );

    expect(result.errors).toEqual([]);
    expect(result.foods).toHaveLength(2);
    expect(result.foods[0]).toMatchObject({
      id: 'yaourt_grec_0',
      name: 'Yaourt grec 0%',
      category: 'Produits laitiers',
      unit: 'g',
      nutritionPer100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
    });
    expect(result.foods[1]).toMatchObject({
      id: 'pain_complet',
      nutritionPer100g: { calories: 250, protein: 9, carbs: 41, fat: 4.2 },
    });
  });

  it('conserve la colonne id et parse la colonne sucre optionnelle', () => {
    const result = parseFoodsCsv(
      [
        'id,name,category,unit,calories,protein,carbs,fat,sugar',
        'custom_milk,Milk,Dairy,ml,46,3.4,4.8,1.5,4.8',
      ].join('\n')
    );

    expect(result.errors).toEqual([]);
    expect(result.foods[0]).toMatchObject({
      id: 'custom_milk',
      nutritionPer100g: { sugar: 4.8 },
    });
  });

  it('parse les décimales à virgule', () => {
    const result = parseFoodsCsv(
      [
        'nom;categorie;calories;proteines;glucides;lipides',
        'Yaourt;Produits laitiers;59;10;3,6;0,4',
      ].join('\n')
    );

    expect(result.errors).toEqual([]);
    expect(result.foods[0]).toMatchObject({
      nutritionPer100g: { carbs: 3.6, fat: 0.4 },
    });
  });

  it('parse un champ entre guillemets contenant le séparateur', () => {
    const result = parseFoodsCsv(
      [
        'nom;categorie;calories;proteines;glucides;lipides',
        '"Riz; complet";Féculents;120;2.6;25;1',
      ].join('\n')
    );

    expect(result.errors).toEqual([]);
    expect(result.foods[0]).toMatchObject({
      id: 'riz_complet',
      name: 'Riz; complet',
      category: 'Féculents',
    });
  });

  it('remonte une erreur si une colonne requise manque', () => {
    const result = parseFoodsCsv(
      [
        'nom;categorie;proteines;glucides;lipides',
        'Yaourt;Produits laitiers;10;3.6;0.4',
      ].join('\n')
    );

    expect(result.foods).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('calories');
  });
});
