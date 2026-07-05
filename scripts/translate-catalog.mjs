import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'src', 'data', 'exercises.catalog.json');
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434/api/generate';
const MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:14b';
const SAVE_EVERY = 10;

const GLOSSARY = [
  'Bench Press→Développé couché',
  'Incline→incliné',
  'Decline→décliné',
  'Squat→Squat',
  'Deadlift→Soulevé de terre',
  'Row→Rowing',
  'Overhead/Shoulder Press→Développé militaire',
  'Press→Développé',
  'Curl→Curl',
  'Fly/Flye→Écarté',
  'Lateral Raise→Élévation latérale',
  'Front Raise→Élévation frontale',
  'Raise→Élévation',
  'Extension→Extension',
  'Lat Pulldown/Pulldown→Tirage vertical',
  'Pull-up/Chin-up→Traction',
  'Push-up→Pompe',
  'Lunge→Fente',
  'Calf Raise→Extension mollets',
  'Dip→Dips',
  'Crunch→Crunch',
  'Cable→Poulie',
  'Dumbbell→Haltères',
  'Barbell→Barre',
  'Kettlebell→Kettlebell',
  'Machine→Machine',
  'Leg Press→Presse à cuisses',
  'Leg Curl→Leg curl (ischios)',
  'Leg Extension→Leg extension (quadriceps)',
  'Good Morning→Good morning',
  "Shrug→Haussement d'épaules",
  'Pushdown→Extension à la poulie',
].join(' | ');

function readLimitArg() {
  const envLimit = process.env.CATALOG_TRANSLATE_LIMIT;
  const limitFromEnv = envLimit ? Number.parseInt(envLimit, 10) : undefined;
  if (Number.isFinite(limitFromEnv) && limitFromEnv > 0) return limitFromEnv;

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--limit') {
      const value = Number.parseInt(process.argv[i + 1] ?? '', 10);
      return Number.isFinite(value) && value > 0 ? value : undefined;
    }
    if (arg.startsWith('--limit=')) {
      const value = Number.parseInt(arg.slice('--limit='.length), 10);
      return Number.isFinite(value) && value > 0 ? value : undefined;
    }
  }

  return undefined;
}

function buildPrompt(exercise) {
  return `Tu es traducteur français spécialisé en musculation.

Traduis le nom et les instructions de l'exercice en français naturel et précis.
Réponds uniquement avec un JSON strict au format {"name":"...","instructions":["...","..."]}.
N'ajoute aucun commentaire, aucune balise markdown et aucun texte hors JSON.

Glossaire obligatoire pour guider les noms :
${GLOSSARY}

Conserve les termes usuels de salle quand ils sont naturels en français.
Ne traduis pas les IDs, ne change pas le nombre d'instructions sauf si une phrase vide est présente.

Exercice source :
Nom : ${exercise.name}
Groupe : ${exercise.bodyPart}
Cible : ${exercise.target}
Muscles secondaires : ${(exercise.secondaryMuscles ?? []).join(', ') || 'aucun'}
Équipement : ${exercise.equipment}
Instructions : ${JSON.stringify(exercise.instructions ?? [])}`;
}

function stripModelJson(text) {
  let cleaned = String(text ?? '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();

  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return cleaned;
}

function parseTranslation(text) {
  const parsed = JSON.parse(stripModelJson(text));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('réponse JSON non objet');
  }

  const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
  const instructions = Array.isArray(parsed.instructions)
    ? parsed.instructions.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (!name || instructions.length === 0) {
    throw new Error('réponse JSON incomplète');
  }

  return { name, instructions };
}

async function callOllama(prompt) {
  let res;
  try {
    res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        think: false,
        options: { temperature: 0.2 },
        prompt,
      }),
    });
  } catch (err) {
    throw new Error(`Ollama injoignable (${err.message})`);
  }

  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}: vérifie que le modèle ${MODEL} est disponible`);
  }

  const data = await res.json();
  if (typeof data.response !== 'string') {
    throw new Error('champ response manquant');
  }

  return data.response;
}

async function translateExercise(exercise) {
  const prompt = buildPrompt(exercise);
  let lastError;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let response;
    try {
      response = await callOllama(prompt);
    } catch (err) {
      throw err;
    }

    try {
      return parseTranslation(response);
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        console.warn(`warning ${exercise.id}: retry traduction (${err.message})`);
      }
    }
  }

  console.warn(`warning ${exercise.id}: garde l'anglais (${lastError?.message ?? 'erreur inconnue'})`);
  return {
    name: exercise.name,
    instructions: Array.isArray(exercise.instructions) ? exercise.instructions : [],
  };
}

async function saveCatalog(catalog) {
  await fs.writeFile(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
}

function needsTranslation(exercise) {
  return !exercise.nameFr || !Array.isArray(exercise.instructionsFr) || exercise.instructionsFr.length === 0;
}

async function main() {
  const limit = readLimitArg();
  const catalog = JSON.parse(await fs.readFile(CATALOG, 'utf8'));
  let processed = 0;
  let unsaved = 0;

  for (let i = 0; i < catalog.length; i++) {
    const exercise = catalog[i];
    if (!needsTranslation(exercise)) continue;
    if (limit && processed >= limit) break;

    process.stdout.write(`${i + 1}/${catalog.length} ${exercise.id} ${exercise.name}\n`);
    const translated = await translateExercise(exercise);
    exercise.nameFr = translated.name;
    exercise.instructionsFr = translated.instructions;
    processed += 1;
    unsaved += 1;

    if (unsaved >= SAVE_EVERY) {
      await saveCatalog(catalog);
      unsaved = 0;
    }
  }

  if (unsaved > 0) {
    await saveCatalog(catalog);
  }

  console.log(`Terminé: ${processed} exercice(s) traduit(s).`);

  if (limit) {
    console.log(`\nRésultat des ${limit} premiers exercices:`);
    for (const exercise of catalog.slice(0, limit)) {
      console.log(`- ${exercise.id}: ${exercise.nameFr ?? exercise.name}`);
      for (const instruction of exercise.instructionsFr ?? exercise.instructions ?? []) {
        console.log(`  • ${instruction}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('ÉCHEC:', err.message);
  process.exit(1);
});
