// ---------------------------------------------------------------------------
// Jest test harness for scripts/lib/offNormalize.mjs
// Spawns a Node subprocess because jest-expo does not transform .mjs files.
// ---------------------------------------------------------------------------

const { spawnSync } = require('node:child_process');
const { writeFileSync, unlinkSync } = require('node:fs');
const path = require('node:path');

const runnerCode = `
import { normalizeName, mapCategory, isPlausibleNutrition, energyConsistent, buildFoodId, pickUnit, dedupe } from '../lib/offNormalize.mjs';

let passed = 0;
let failed = 0;

function assert(cond, name) {
  if (cond) { passed++; }
  else { failed++; console.error('FAIL: ' + name); }
}

// normalizeName
assert(normalizeName('Crème Fraîche Épaisse') === 'creme fraiche epaisse', 'normalizeName diacritics');
assert(normalizeName('Pain 100% -- complet!') === 'pain 100 complet', 'normalizeName punctuation');
assert(normalizeName('   Haricots   verts   ') === 'haricots verts', 'normalizeName whitespace');
assert(normalizeName(null) === '', 'normalizeName null');
assert(normalizeName(undefined) === '', 'normalizeName undefined');
assert(normalizeName(123) === '', 'normalizeName number');

// mapCategory
assert(mapCategory(['en:meats', 'en:poultry', 'en:chicken']) === 'Viande', 'mapCategory meats');
assert(mapCategory(['en:fish', 'en:salmon']) === 'Poisson', 'mapCategory fish');
assert(mapCategory(['en:eggs']) === 'Œufs', 'mapCategory eggs');
assert(mapCategory(['en:dairies', 'en:yogurt']) === 'Produits laitiers', 'mapCategory dairy');
assert(mapCategory(['en:cereals', 'en:pasta']) === 'Féculents', 'mapCategory cereals');
assert(mapCategory(['en:vegetables', 'en:tomatoes']) === 'Légumes', 'mapCategory vegetables');
assert(mapCategory(['en:fruits', 'en:apples']) === 'Fruits', 'mapCategory fruits');
assert(mapCategory(['en:legumes', 'en:lentils']) === 'Légumineuses', 'mapCategory legumes');
assert(mapCategory(['en:fats', 'en:olive-oils']) === 'Matières grasses', 'mapCategory fats');
assert(mapCategory(['en:nuts', 'en:almonds']) === 'Noix & graines', 'mapCategory nuts');
assert(mapCategory(['en:beverages', 'en:water']) === 'Boissons', 'mapCategory beverages');
assert(mapCategory(['en:chocolate', 'en:sweets']) === 'Snacks/Sucré', 'mapCategory chocolate');
assert(mapCategory(['en:pet-food']) === null, 'mapCategory unknown → null');
assert(mapCategory([]) === null, 'mapCategory empty → null');
assert(mapCategory(null) === null, 'mapCategory null input → null');
assert(mapCategory(['en:butters']) === 'Matières grasses', 'mapCategory butter → Matières grasses');
assert(mapCategory(['en:butters', 'en:dairies']) === 'Matières grasses', 'mapCategory butter+dairy → Matières grasses');

// Non-regression tests with real OFF tags
assert(mapCategory(['en:breakfasts','en:spreads','en:sweet-spreads','fr:pates-a-tartiner','en:hazelnut-spreads','en:chocolate-spreads','en:cocoa-and-hazelnuts-spreads','en:confectionary-based-spreads','en:pates-a-tartiner-au-chocolat','en:pates-a-tartiner-aux-noisettes','en:pates-a-tartiner-aux-noisettes-et-au-cacao','en:petit-dejeuners','en:produits-a-tartiner','en:produits-a-tartiner-sucres']) === 'Snacks/Sucré', 'mapCategory Nutella → Snacks/Sucré (NOT Viande)');
assert(mapCategory(['en:meats','en:prepared-meats','fr:pates','en:terrines']) === 'Viande', 'mapCategory pâté de campagne → Viande');
assert(mapCategory(['en:snacks','en:salty-snacks','en:popcorn']) === 'Snacks/Sucré', 'mapCategory popcorn → Snacks/Sucré (NOT Féculents)');
assert(mapCategory(['en:fats','en:vegetable-fats','en:olive-oils']) === 'Matières grasses', 'mapCategory olive oil → Matières grasses');
assert(mapCategory(['en:meats','en:poultry','en:chicken-breasts']) === 'Viande', 'mapCategory blanc de poulet → Viande');
assert(mapCategory(['en:dairies','en:fermented-foods','en:yogurts']) === 'Produits laitiers', 'mapCategory yaourt nature → Produits laitiers');
assert(mapCategory(['en:beverages','en:juices','en:orange-juices']) === 'Boissons', 'mapCategory orange juice → Boissons');
assert(mapCategory(['en:cereals-and-potatoes','en:pastas']) === 'Féculents', 'mapCategory pâtes alimentaires → Féculents');

// isPlausibleNutrition
assert(isPlausibleNutrition({ 'energy-kcal_100g': 200, 'proteins_100g': 10, 'carbohydrates_100g': 20, 'fat_100g': 8 }) === true, 'isPlausible valid');
assert(isPlausibleNutrition({ 'energy-kcal_100g': 5000, 'proteins_100g': 10, 'carbohydrates_100g': 20, 'fat_100g': 8 }) === false, 'isPlausible kcal 5000');
assert(isPlausibleNutrition({ 'energy-kcal_100g': 100, 'proteins_100g': -5, 'carbohydrates_100g': 20, 'fat_100g': 8 }) === false, 'isPlausible negative macro');
assert(isPlausibleNutrition({ 'energy-kcal_100g': 100, 'proteins_100g': 10 }) === false, 'isPlausible missing macros');
assert(isPlausibleNutrition({ 'energy-kcal_100g': 800, 'proteins_100g': 150, 'carbohydrates_100g': 20, 'fat_100g': 8 }) === false, 'isPlausible macro > 100');
assert(isPlausibleNutrition(null) === false, 'isPlausible null');
assert(isPlausibleNutrition(undefined) === false, 'isPlausible undefined');

// energyConsistent
assert(energyConsistent({ 'energy-kcal_100g': 200, 'proteins_100g': 10, 'carbohydrates_100g': 20, 'fat_100g': 8 }) === true, 'energyConsistent valid');
assert(energyConsistent({ 'energy-kcal_100g': 500, 'proteins_100g': 10, 'carbohydrates_100g': 20, 'fat_100g': 8 }) === false, 'energyConsistent inconsistent');
assert(energyConsistent({ 'energy-kcal_100g': 0, 'proteins_100g': 0, 'carbohydrates_100g': 0, 'fat_100g': 0 }) === true, 'energyConsistent zero cal');
assert(energyConsistent({ 'energy-kcal_100g': 0, 'proteins_100g': 5, 'carbohydrates_100g': 0, 'fat_100g': 0 }) === false, 'energyConsistent zero cal with protein');

// buildFoodId
assert(buildFoodId('France', '3017620422003') === 'off_france_3017620422003', 'buildFoodId France');
assert(buildFoodId('ESPAÑA', '12345') === 'off_espana_12345', 'buildFoodId ESPAÑA');
assert(buildFoodId('United Kingdom', '999') === 'off_unitedkingdom_999', 'buildFoodId UK');

// pickUnit — strict whitelist: exact slug equality after language-prefix strip, solids first
assert(pickUnit(['en:dairies','en:fats','en:spreads','en:spreadable-fats','en:animal-fats','en:dairy-spreads','en:milkfat','en:butters']) === 'g', 'pickUnit Kerrygold butter → g');
assert(pickUnit(['en:dairies','en:fermented-foods','en:fermented-milk-products','en:desserts','en:yogurts','en:fermented-dairy-desserts']) === 'g', 'pickUnit yogurts → g');
assert(pickUnit(['en:dairies','en:cheeses','en:hard-cheeses','en:cows-milk-cheeses']) === 'g', 'pickUnit cheeses → g');
assert(pickUnit(['en:plant-based-foods-and-beverages','en:beverages','en:plant-based-beverages','en:plant-based-milks','en:soy-milks']) === 'ml', 'pickUnit soy milks → ml');
assert(pickUnit(['en:beverages','en:waters','en:spring-waters','en:natural-mineral-waters']) === 'ml', 'pickUnit waters → ml');
assert(pickUnit(['en:beverages','en:carbonated-drinks','en:sodas','en:colas']) === 'ml', 'pickUnit sodas → ml');
assert(pickUnit(['en:dairies','en:milks','en:whole-milks']) === 'ml', 'pickUnit whole milks → ml');
assert(pickUnit(['en:cereals-and-potatoes','en:cereals-and-their-products','en:breakfast-cereals']) === 'g', 'pickUnit breakfast cereals → g');
assert(pickUnit(['en:fats','en:spreads','en:vegetable-fats','en:margarines']) === 'g', 'pickUnit margarines → g');
assert(pickUnit([]) === 'g', 'pickUnit empty → g');
assert(pickUnit(null) === 'g', 'pickUnit null → g');

// dedupe
const dedupe1 = dedupe([{ barcode: '001', name: 'A' }, { barcode: '001', name: 'A dup' }, { barcode: '002', name: 'B' }]);
assert(dedupe1.length === 2 && dedupe1[0].name === 'A' && dedupe1[1].name === 'B', 'dedupe by barcode');

const dedupe2 = dedupe([{ barcode: '001', name: 'Crème fraîche' }, { barcode: '002', name: 'Creme Fraiche' }, { barcode: '003', name: 'Yaourt' }]);
assert(dedupe2.length === 2, 'dedupe by normalised name');

const dedupe3 = dedupe([]);
assert(dedupe3.length === 0, 'dedupe empty');

console.log('ALL_TESTS_PASSED:' + passed + '/0 failures');
`;

describe('offNormalize pure functions', () => {
  const tmpFile = path.join(__dirname, '_offnormalize_test_runner.mjs');

  beforeAll(() => {
    writeFileSync(tmpFile, runnerCode, 'utf-8');
  });

  afterAll(() => {
    try { unlinkSync(tmpFile); } catch (_) { /* ok */ }
  });

  it('all pure function tests pass', () => {
    const result = spawnSync(process.execPath, [tmpFile], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      timeout: 10000,
    });

    if (result.status !== 0 || result.error) {
      throw new Error(
        'Test runner failed:\n' +
        'stdout: ' + (result.stdout || '') + '\n' +
        'stderr: ' + (result.stderr || '') + '\n' +
        'error: ' + (result.error ? result.error.message : 'exit code ' + result.status)
      );
    }

    expect(result.stdout).toContain('ALL_TESTS_PASSED');
  });
});
