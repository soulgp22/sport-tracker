import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAiTrainingOptInStore } from '../../store/aiTrainingOptInStore';
import {
  MAX_TRAINING_RECORDS,
  appendTrainingRecord,
  buildTrainingRecord,
  clearRecords,
  exportRecordsJson,
  getRecords,
  logMealPhotoTraining,
  type FinalItem,
  type MealPhotoTrainingRecord,
  type ModelItem,
} from '../mealPhotoTrainingLog';

beforeEach(async () => {
  await AsyncStorage.clear();
  useAiTrainingOptInStore.setState({ aiTrainingOptIn: false });
});

function makeRecord(index: number): MealPhotoTrainingRecord {
  return {
    id: `rec-${index}`,
    createdAt: '2026-07-28T00:00:00.000Z',
    modelItems: [{ name: 'riz', grams: 150 }],
    corrections: [{ action: 'kept', recognizedName: 'riz', gramsBefore: 150 }],
  };
}

describe('buildTrainingRecord', () => {
  it('item conservé tel quel → kept', () => {
    const model: ModelItem[] = [{ name: 'riz', grams: 150, matchedFoodName: 'Riz blanc cuit' }];
    const final: FinalItem[] = [{ recognizedName: 'riz', foodName: 'Riz blanc cuit', grams: 150 }];

    const record = buildTrainingRecord(model, final);

    expect(record.corrections).toEqual([
      { action: 'kept', recognizedName: 'riz', gramsBefore: 150 },
    ]);
    expect(record.modelItems).toEqual(model);
    expect(record.id).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
  });

  it('grammes modifiés → edited avec gramsBefore/gramsAfter', () => {
    const record = buildTrainingRecord(
      [{ name: 'riz', grams: 150, matchedFoodName: 'Riz blanc cuit' }],
      [{ recognizedName: 'riz', foodName: 'Riz blanc cuit', grams: 200 }]
    );

    expect(record.corrections).toEqual([
      { action: 'edited', recognizedName: 'riz', gramsBefore: 150, gramsAfter: 200 },
    ]);
  });

  it('item supprimé → removed', () => {
    const record = buildTrainingRecord([{ name: 'brocoli', grams: 80 }], []);

    expect(record.corrections).toEqual([
      { action: 'removed', recognizedName: 'brocoli', gramsBefore: 80 },
    ]);
  });

  it('aliment re-mappé vers un autre → remapped', () => {
    const record = buildTrainingRecord(
      [{ name: 'riz', grams: 150, matchedFoodName: 'Riz blanc cuit' }],
      [{ recognizedName: 'riz', foodName: 'Quinoa cuit', grams: 175 }]
    );

    expect(record.corrections).toEqual([
      {
        action: 'remapped',
        recognizedName: 'riz',
        foodName: 'Quinoa cuit',
        gramsBefore: 150,
        gramsAfter: 175,
      },
    ]);
  });

  it('match manuel quand le pipeline n’avait rien trouvé → remapped', () => {
    const record = buildTrainingRecord(
      [{ name: 'poulet', grams: 120, matchedFoodName: null }],
      [{ recognizedName: 'poulet', foodName: 'Blanc de poulet', grams: 120 }]
    );

    expect(record.corrections).toEqual([
      {
        action: 'remapped',
        recognizedName: 'poulet',
        foodName: 'Blanc de poulet',
        gramsBefore: 120,
        gramsAfter: 120,
      },
    ]);
  });

  it('ajout manuel (absent de la sortie modèle) → added', () => {
    const record = buildTrainingRecord(
      [{ name: 'riz', grams: 150, matchedFoodName: 'Riz blanc cuit' }],
      [
        { recognizedName: 'riz', foodName: 'Riz blanc cuit', grams: 150 },
        { recognizedName: null, foodName: 'Huile d’olive', grams: 10 },
      ]
    );

    expect(record.corrections).toEqual([
      { action: 'kept', recognizedName: 'riz', gramsBefore: 150 },
      { action: 'added', foodName: 'Huile d’olive', grams: 10 },
    ]);
  });

  it('cas mixte : kept + edited + removed + remapped + added', () => {
    const model: ModelItem[] = [
      { name: 'riz', grams: 150, matchedFoodName: 'Riz blanc cuit' },
      { name: 'poulet', grams: 120, matchedFoodName: 'Blanc de poulet' },
      { name: 'brocoli', grams: 80, matchedFoodName: 'Brocoli' },
      { name: 'sauce', grams: 30, matchedFoodName: 'Sauce tomate' },
    ];
    const final: FinalItem[] = [
      { recognizedName: 'riz', foodName: 'Riz blanc cuit', grams: 150 },
      { recognizedName: 'poulet', foodName: 'Blanc de poulet', grams: 150 },
      // brocoli supprimé
      { recognizedName: 'sauce', foodName: 'Sauce soja', grams: 30 },
      { recognizedName: null, foodName: 'Pain complet', grams: 40 },
    ];

    const record = buildTrainingRecord(model, final);

    expect(record.corrections).toEqual([
      { action: 'kept', recognizedName: 'riz', gramsBefore: 150 },
      { action: 'edited', recognizedName: 'poulet', gramsBefore: 120, gramsAfter: 150 },
      { action: 'removed', recognizedName: 'brocoli', gramsBefore: 80 },
      {
        action: 'remapped',
        recognizedName: 'sauce',
        foodName: 'Sauce soja',
        gramsBefore: 30,
        gramsAfter: 30,
      },
      { action: 'added', foodName: 'Pain complet', grams: 40 },
    ]);
  });

  it('appariement insensible à la casse et aux accents', () => {
    const record = buildTrainingRecord(
      [{ name: 'Poulet grillé', grams: 120, matchedFoodName: null }],
      [{ recognizedName: 'poulet grille', foodName: null, grams: 100 }]
    );

    expect(record.corrections).toEqual([
      { action: 'edited', recognizedName: 'Poulet grillé', gramsBefore: 120, gramsAfter: 100 },
    ]);
  });

  it('deux items de même nom : chaque final n’est consommé qu’une fois', () => {
    const record = buildTrainingRecord(
      [
        { name: 'riz', grams: 100 },
        { name: 'riz', grams: 200 },
      ],
      [{ recognizedName: 'riz', foodName: null, grams: 100 }]
    );

    expect(record.corrections).toEqual([
      { action: 'kept', recognizedName: 'riz', gramsBefore: 100 },
      { action: 'removed', recognizedName: 'riz', gramsBefore: 200 },
    ]);
  });
});

describe('persistance', () => {
  it('append puis getRecords restitue les records dans l’ordre', async () => {
    await appendTrainingRecord(makeRecord(1));
    await appendTrainingRecord(makeRecord(2));

    const records = await getRecords();
    expect(records).toHaveLength(2);
    expect(records[0].id).toBe('rec-1');
    expect(records[1].id).toBe('rec-2');
  });

  it('plafond de 500 records : les plus anciens sont éjectés (FIFO)', async () => {
    for (let index = 0; index < MAX_TRAINING_RECORDS + 5; index += 1) {
      await appendTrainingRecord(makeRecord(index));
    }

    const records = await getRecords();
    expect(records).toHaveLength(MAX_TRAINING_RECORDS);
    expect(records[0].id).toBe('rec-5');
    expect(records[records.length - 1].id).toBe(`rec-${MAX_TRAINING_RECORDS + 4}`);
  });

  it('clearRecords vide le journal', async () => {
    await appendTrainingRecord(makeRecord(1));
    await clearRecords();

    expect(await getRecords()).toEqual([]);
  });

  it('getRecords retourne [] si le stockage est corrompu', async () => {
    await AsyncStorage.setItem('meal-photo-training-log-v1', '{pas du json');

    expect(await getRecords()).toEqual([]);
  });

  it('exportRecordsJson produit {version: 1, exportedAt, records}', async () => {
    await appendTrainingRecord(makeRecord(1));

    const parsed = JSON.parse(await exportRecordsJson()) as {
      version: number;
      exportedAt: string;
      records: MealPhotoTrainingRecord[];
    };

    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].id).toBe('rec-1');
  });
});

describe('opt-in', () => {
  const model: ModelItem[] = [{ name: 'riz', grams: 150, matchedFoodName: 'Riz blanc cuit' }];
  const final: FinalItem[] = [{ recognizedName: 'riz', foodName: 'Riz blanc cuit', grams: 200 }];

  it('opt-in inactif → rien n’est écrit', async () => {
    await logMealPhotoTraining(model, final);

    expect(await getRecords()).toEqual([]);
    expect(await AsyncStorage.getItem('meal-photo-training-log-v1')).toBeNull();
  });

  it('opt-in actif → le record est écrit', async () => {
    useAiTrainingOptInStore.setState({ aiTrainingOptIn: true });

    await logMealPhotoTraining(model, final);

    const records = await getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].corrections).toEqual([
      { action: 'edited', recognizedName: 'riz', gramsBefore: 150, gramsAfter: 200 },
    ]);
  });

  it('opt-in actif mais aucun item modèle → rien n’est écrit', async () => {
    useAiTrainingOptInStore.setState({ aiTrainingOptIn: true });

    await logMealPhotoTraining([], final);

    expect(await getRecords()).toEqual([]);
  });
});
