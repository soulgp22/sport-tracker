import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const communityDir = path.join(root, 'community');
const catalogPath = path.join(root, 'src', 'data', 'exercises.catalog.json');
const foodsCatalogPath = path.join(root, 'src', 'data', 'foods.default.json');
const manifestPath = path.join(communityDir, 'index.json');
const allowedFoodUnits = new Set(['g', 'ml', 'portion', 'unité']);
const legacyRetailerCategories = new Set(['Céréales', 'Poissons', 'Viandes', 'Oléagineux', 'Pains']);

function readJson(filePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${path.relative(root, filePath)} : JSON invalide (${error.message}).`);
    return null;
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteInRange(value, minimum, maximum) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isOpenFoodFactsDatabase(entry, payload) {
  return [entry.license, entry.attribution, payload?.source?.license, payload?.source?.attribution]
    .some((value) => typeof value === 'string' && /open food facts|world\.openfoodfacts\.org/i.test(value));
}

export function validateCommunity() {
  const errors = [];
  const jsonFiles = fs.readdirSync(communityDir).filter((file) => file.endsWith('.json')).sort();
  const parsedFiles = new Map();

  for (const file of jsonFiles) {
    parsedFiles.set(file, readJson(path.join(communityDir, file), errors));
  }

  const catalog = readJson(catalogPath, errors);
  const catalogNames = new Set(
    Array.isArray(catalog)
      ? catalog.filter((entry) => isRecord(entry) && typeof entry.name === 'string').map((entry) => entry.name)
      : []
  );
  const foodsCatalog = readJson(foodsCatalogPath, errors);
  const foodCategories = new Set(
    Array.isArray(foodsCatalog)
      ? foodsCatalog
        .filter((entry) => isRecord(entry) && typeof entry.category === 'string')
        .map((entry) => entry.category)
      : []
  );
  const manifest = parsedFiles.get(path.basename(manifestPath));

  if (!isRecord(manifest) || !Array.isArray(manifest.programs)) {
    errors.push('community/index.json : tableau programs manquant ou invalide.');
    return { errors, jsonFilesCount: jsonFiles.length, programsCount: 0 };
  }

  const manifestIds = new Set();
  for (const section of ['programs', 'foodDatabases', 'exercisePacks']) {
    const entries = manifest[section] ?? [];
    if (!Array.isArray(entries)) {
      errors.push(`community/index.json : ${section} doit être un tableau.`);
      continue;
    }
    for (const entry of entries) {
      if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id.trim() === '') {
        errors.push(`community/index.json : entrée ${section} sans id valide.`);
        continue;
      }
      if (manifestIds.has(entry.id)) {
        errors.push(`community/index.json : id dupliqué « ${entry.id} ».`);
      }
      manifestIds.add(entry.id);

      if (
        typeof entry.file !== 'string' ||
        !fs.existsSync(path.join(communityDir, entry.file)) ||
        (entry.file.endsWith('.json') && !parsedFiles.has(entry.file))
      ) {
        errors.push(`community/index.json : fichier référencé introuvable « ${entry.file ?? ''} » (${entry.id}).`);
      }
    }
  }

  const foodIds = new Map();
  const barcodesByCountry = new Map();
  let foodsCount = 0;

  for (const entry of manifest.foodDatabases ?? []) {
    if (!isRecord(entry) || typeof entry.file !== 'string') continue;
    const location = `community/${entry.file}`;
    if (entry.format !== 'json') {
      errors.push(`${location} : seules les bases d’aliments JSON sont validées.`);
      continue;
    }

    const payload = parsedFiles.get(entry.file);
    if (!isRecord(payload) || !Array.isArray(payload.foods)) {
      errors.push(`${location} : format invalide, tableau foods manquant.`);
      continue;
    }

    foodsCount += payload.foods.length;
    if (!Number.isInteger(entry.foodsCount) || entry.foodsCount !== payload.foods.length) {
      errors.push(
        `community/index.json : ${entry.id}.foodsCount=${entry.foodsCount ?? 'invalide'}, contenu=${payload.foods.length}.`
      );
    }

    const openFoodFacts = isOpenFoodFactsDatabase(entry, payload);
    const legacyRetailerDatabase = typeof entry.retailer === 'string' && !Array.isArray(entry.retailers);
    const idsInFile = new Set();
    const barcodesInFile = new Set();
    const country = typeof entry.country === 'string'
      ? entry.country
      : typeof payload.source?.country === 'string' ? payload.source.country : entry.id;

    for (const [foodIndex, food] of payload.foods.entries()) {
      const foodLocation = `${location}, aliment ${foodIndex + 1}`;
      if (!isRecord(food)) {
        errors.push(`${foodLocation} : entrée invalide.`);
        continue;
      }

      if (typeof food.id !== 'string' || food.id.trim() === '') {
        errors.push(`${foodLocation} : id manquant ou invalide.`);
      } else {
        if (idsInFile.has(food.id)) {
          errors.push(`${foodLocation} : id dupliqué dans le fichier « ${food.id} ».`);
        }
        idsInFile.add(food.id);
        if (foodIds.has(food.id) && foodIds.get(food.id) !== entry.file) {
          errors.push(`${foodLocation} : id dupliqué entre fichiers « ${food.id} » (déjà dans ${foodIds.get(food.id)}).`);
        } else if (!foodIds.has(food.id)) {
          foodIds.set(food.id, entry.file);
        }
      }

      if (
        typeof food.category !== 'string' ||
        (!foodCategories.has(food.category) &&
          !(legacyRetailerDatabase && legacyRetailerCategories.has(food.category)))
      ) {
        errors.push(`${foodLocation} : catégorie hors liste de l’app « ${food.category ?? ''} ».`);
      }
      if (typeof food.unit !== 'string' || !allowedFoodUnits.has(food.unit)) {
        errors.push(`${foodLocation} : unité invalide « ${food.unit ?? ''} ».`);
      }

      const nutrition = food.nutritionPer100g;
      if (!isRecord(nutrition)) {
        errors.push(`${foodLocation} : nutritionPer100g manquant ou invalide.`);
      } else {
        if (!isFiniteInRange(nutrition.calories, 0, 900)) {
          errors.push(`${foodLocation} : calories hors plage 0–900.`);
        }
        for (const macro of ['protein', 'carbs', 'fat']) {
          if (!isFiniteInRange(nutrition[macro], 0, 100)) {
            errors.push(`${foodLocation} : ${macro} hors plage 0–100.`);
          }
        }
        for (const optionalMacro of ['fiber', 'sugar', 'salt']) {
          if (optionalMacro in nutrition && !isFiniteInRange(nutrition[optionalMacro], 0, 100)) {
            errors.push(`${foodLocation} : ${optionalMacro} hors plage 0–100.`);
          }
        }

        if (
          isFiniteInRange(nutrition.calories, 0, 900) &&
          ['protein', 'carbs', 'fat'].every((macro) => isFiniteInRange(nutrition[macro], 0, 100))
        ) {
          const expectedCalories = 4 * nutrition.protein + 4 * nutrition.carbs + 9 * nutrition.fat;
          const consistent = nutrition.calories === 0
            ? expectedCalories === 0
            : Math.abs(nutrition.calories - expectedCalories) <= nutrition.calories * 0.35;
          if (!consistent) {
            errors.push(
              `${foodLocation} : énergie incohérente (${nutrition.calories} kcal, macros=${expectedCalories.toFixed(1)} kcal).`
            );
          }
        }
      }

      if (typeof food.barcode === 'string' && food.barcode.trim() !== '') {
        const barcode = food.barcode.trim();
        if (barcodesInFile.has(barcode)) {
          errors.push(`${foodLocation} : code-barres dupliqué dans le fichier « ${barcode} ».`);
        }
        barcodesInFile.add(barcode);
        const countryBarcode = `${country}\u0000${barcode}`;
        if (
          barcodesByCountry.has(countryBarcode) &&
          barcodesByCountry.get(countryBarcode) !== entry.file
        ) {
          errors.push(
            `${foodLocation} : code-barres dupliqué pour ${country} « ${barcode} » (déjà dans ${barcodesByCountry.get(countryBarcode)}).`
          );
        } else if (!barcodesByCountry.has(countryBarcode)) {
          barcodesByCountry.set(countryBarcode, entry.file);
        }
      } else if (openFoodFacts) {
        errors.push(`${foodLocation} : barcode obligatoire pour une base Open Food Facts.`);
      }

      if (openFoodFacts && (typeof food.sourceUrl !== 'string' || food.sourceUrl.trim() === '')) {
        errors.push(`${foodLocation} : sourceUrl obligatoire pour une base Open Food Facts.`);
      }
    }
  }

  const manifestProgramNames = new Set();
  const payloadProgramNames = new Set();
  let programsCount = 0;

  for (const entry of manifest.programs) {
    if (!isRecord(entry)) continue;
    if (typeof entry.name !== 'string' || entry.name.trim() === '') {
      errors.push(`community/index.json : programme ${entry.id ?? '?'} sans nom valide.`);
    } else if (manifestProgramNames.has(entry.name)) {
      errors.push(`community/index.json : nom de programme dupliqué « ${entry.name} ».`);
    } else {
      manifestProgramNames.add(entry.name);
    }

    if (typeof entry.file !== 'string') continue;
    const payload = parsedFiles.get(entry.file);
    if (!isRecord(payload) || payload.version !== 1 || !Array.isArray(payload.programs)) {
      errors.push(`community/${entry.file} : format de pack version 1 invalide.`);
      continue;
    }

    let actualDaysCount = 0;
    let actualExercisesCount = 0;
    for (const program of payload.programs) {
      programsCount += 1;
      if (!isRecord(program) || typeof program.name !== 'string' || !Array.isArray(program.days)) {
        errors.push(`community/${entry.file} : programme ou tableau days invalide.`);
        continue;
      }
      if (payloadProgramNames.has(program.name)) {
        errors.push(`community/${entry.file} : nom de programme dupliqué « ${program.name} ».`);
      }
      payloadProgramNames.add(program.name);
      if (program.name !== entry.name) {
        errors.push(`community/${entry.file} : le nom « ${program.name} » diffère du manifeste « ${entry.name} ».`);
      }

      actualDaysCount += program.days.length;
      for (const [dayIndex, currentDay] of program.days.entries()) {
        if (!isRecord(currentDay) || !Array.isArray(currentDay.exercises)) {
          errors.push(`community/${entry.file} : jour ${dayIndex + 1} invalide.`);
          continue;
        }
        actualExercisesCount += currentDay.exercises.length;

        for (const [exerciseIndex, currentExercise] of currentDay.exercises.entries()) {
          const location = `community/${entry.file}, jour ${dayIndex + 1}, exercice ${exerciseIndex + 1}`;
          if (!isRecord(currentExercise)) {
            errors.push(`${location} : entrée invalide.`);
            continue;
          }
          if (typeof currentExercise.exerciseName !== 'string' || !catalogNames.has(currentExercise.exerciseName)) {
            errors.push(`${location} : exerciseName hors catalogue « ${currentExercise.exerciseName ?? ''} ».`);
          }
          const alternatives = currentExercise.alternativeExerciseNames ?? [];
          if (!Array.isArray(alternatives)) {
            errors.push(`${location} : alternativeExerciseNames doit être un tableau.`);
          } else {
            for (const alternative of alternatives) {
              if (typeof alternative !== 'string' || !catalogNames.has(alternative)) {
                errors.push(`${location} : alternative hors catalogue « ${alternative ?? ''} ».`);
              }
            }
          }
          if (!Array.isArray(currentExercise.sets) || currentExercise.sets.length === 0) {
            errors.push(`${location} : sets doit être un tableau non vide.`);
          } else {
            for (const [setIndex, currentSet] of currentExercise.sets.entries()) {
              if (
                !isRecord(currentSet) ||
                !Number.isInteger(currentSet.reps) || currentSet.reps <= 0 ||
                currentSet.weight !== 0 ||
                !Number.isInteger(currentSet.restSeconds) || currentSet.restSeconds <= 0
              ) {
                errors.push(`${location}, série ${setIndex + 1} : reps/restSeconds invalides ou weight différent de 0.`);
              }
            }
          }
        }
      }
    }

    if (entry.daysCount !== actualDaysCount) {
      errors.push(`community/index.json : ${entry.id}.daysCount=${entry.daysCount}, contenu=${actualDaysCount}.`);
    }
    if (entry.exercisesCount !== actualExercisesCount) {
      errors.push(`community/index.json : ${entry.id}.exercisesCount=${entry.exercisesCount}, contenu=${actualExercisesCount}.`);
    }
  }

  return { errors, jsonFilesCount: jsonFiles.length, programsCount, foodsCount };
}

const result = validateCommunity();
if (result.errors.length > 0) {
  console.error(`Validation Community échouée (${result.errors.length} erreur(s)) :`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Validation Community réussie : ${result.jsonFilesCount} fichiers JSON valides, ` +
    `${result.programsCount} programmes et ${result.foodsCount} aliments contrôlés.`
  );
}
