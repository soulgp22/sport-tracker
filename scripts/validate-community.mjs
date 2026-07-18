import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const communityDir = path.join(root, 'community');
const catalogPath = path.join(root, 'src', 'data', 'exercises.catalog.json');
const manifestPath = path.join(communityDir, 'index.json');

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

      if (typeof entry.file !== 'string' || !parsedFiles.has(entry.file)) {
        errors.push(`community/index.json : fichier référencé introuvable « ${entry.file ?? ''} » (${entry.id}).`);
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

  return { errors, jsonFilesCount: jsonFiles.length, programsCount };
}

const result = validateCommunity();
if (result.errors.length > 0) {
  console.error(`Validation Community échouée (${result.errors.length} erreur(s)) :`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Validation Community réussie : ${result.jsonFilesCount} fichiers JSON valides, ` +
    `${result.programsCount} programmes, tous les noms d'exercices correspondent au catalogue.`
  );
}
