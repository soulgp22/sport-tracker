/*
 * Re-traduit UNIQUEMENT les noms d'exercices (nameFr) via l'API DeepSeek,
 * avec une boucle de validation (validate-exercise-names.mjs) par lot.
 * Garde instructionsFr et tous les autres champs inchangés ; préserve l'ordre
 * des clés et le formatage JSON pour un diff lisible.
 *
 * Usage :
 *   node scripts/retranslate-names.mjs                # tout le catalogue
 *   node scripts/retranslate-names.mjs --limit=N      # N premiers noms restants
 *   node scripts/retranslate-names.mjs --dry-run      # n'écrit rien, affiche les propositions
 *
 * La clé vient UNIQUEMENT de process.env.DEEPSEEK_API_KEY (jamais en dur).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalog, isBlocking } from './validate-exercise-names.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'src', 'data', 'exercises.catalog.json');
const PROGRESS = path.join(ROOT, '.retranslate-names.progress.json');

const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const TEMPERATURE = 0.1;
const BATCH_SIZE = 30;
const MAX_RETRIES = 3;
const BATCH_ATTEMPTS = 2;

const SYSTEM_PROMPT = `Tu traduis des noms d'exercices de musculation de l'anglais vers le français.

RÈGLE ABSOLUE — le type de mouvement doit correspondre (dans les deux sens) :
squat => squat
deadlift => soulevé de terre
bench press => développé couché
shoulder press / military press => développé militaire
wrist curl => curl des poignets
curl => curl
row / rowing => rowing
lateral raise => élévation latérale
front raise => élévation frontale
pulldown => tirage
pull-up / chin-up => traction
push-up => pompe
lunge => fente
calf raise => extension mollets
dip => dips
fly => écarté
shrug => haussement d'épaules
crunch => crunch
sit-up => relevé de buste

Équipement à refléter dans le nom français (selon le champ equipment fourni) :
barbell => à la barre
dumbbell => aux haltères
cable => à la poulie
machine => à la machine
kettlebells => au kettlebell
e-z curl bar => à la barre EZ
bands => avec bandes élastiques
medicine ball => au médecine-ball
exercise ball => au swiss ball
foam roll => au rouleau

Garde-fous : on te fournit le muscle ciblé (target) et l'équipement (equipment) de
chaque exercice. Le nom français DOIT rester cohérent avec ces deux champs et avec
le mouvement réellement décrit par le nom anglais. Ne traduis JAMAIS par un
mouvement différent de celui du nom anglais (ex. un "hop" n'est pas une élévation
latérale ; un "SMR" n'est pas un tirage). Ne recopie aucun exemple de nom complet :
traduis précisément le nom fourni.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{"translations":[{"id":"<id>","nameFr":"<traduction>"}]}`;

function parseArgs(argv) {
  const opts = { limit: Infinity, dryRun: false, onlyFallbacks: false };
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--only-fallbacks') opts.onlyFallbacks = true;
    else if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice('--limit='.length));
  }
  if (!Number.isFinite(opts.limit) || opts.limit <= 0) opts.limit = Infinity;
  return opts;
}

function readApiKey() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || !key.trim()) {
    console.error('DEEPSEEK_API_KEY absente.');
    console.error('Définis-la avant de lancer, par exemple :');
    console.error('  PowerShell : $env:DEEPSEEK_API_KEY = "sk-..."');
    console.error('  bash       : export DEEPSEEK_API_KEY="sk-..."');
    console.error("La clé n'est jamais écrite dans un fichier (dépôt public).");
    process.exit(1);
  }
  return key.trim();
}

async function chat(apiKey, messages) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, temperature: TEMPERATURE, messages }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek HTTP ${res.status} : ${body.slice(0, 300)}`);
  }
  return res.json();
}

function accumulateUsage(usage, data) {
  const u = data?.usage ?? {};
  for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens', 'prompt_cache_hit_tokens', 'prompt_cache_miss_tokens']) {
    if (typeof u[key] === 'number') usage[key] = (usage[key] ?? 0) + u[key];
  }
}

/** Extrait le premier objet/tableau JSON d'une réponse, même entourée de texte. */
function parseJsonFromContent(text) {
  const s = String(text ?? '').replace(/```(?:json)?/gi, '').trim();
  const candidates = [
    ['{', s.indexOf('{'), s.lastIndexOf('}')],
    ['[', s.indexOf('['), s.lastIndexOf(']')],
  ];
  for (const [, start, end] of candidates) {
    if (start < 0 || end <= start) continue;
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch {
      // essaie le prochain candidat
    }
  }
  return null;
}

/** Transforme une réponse en tableau [{ id, nameFr }]. */
function parseBatchTranslations(text) {
  const parsed = parseJsonFromContent(text);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.translations)) return parsed.translations;
  return null;
}

/** Transforme une réponse en une chaîne nameFr (ou null). */
function parseSingleTranslation(text) {
  const parsed = parseJsonFromContent(text);
  if (typeof parsed === 'string') return parsed.trim();
  if (parsed && typeof parsed.nameFr === 'string') return parsed.nameFr.trim();
  return null;
}

function cleanNameFr(value) {
  const s = String(value ?? '').trim();
  if (s.length < 2 || s.length > 120) return null;
  // Le catalogue capitalise l'initiale (« Crunch », « Élévation latérale ») ;
  // le modèle renvoie parfois « crunch à la machine ». On normalise sans
  // toucher au reste, pour ne pas casser les sigles (EZ, SMR) ni les chiffres.
  return s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1);
}

async function translateBatch(apiKey, items, usage) {
  const payload = items.map((e) => ({
    id: e.id,
    name: e.name,
    target: e.target || e.bodyPart,
    equipment: e.equipment,
  }));
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Traduis ces ${payload.length} noms. Réponds uniquement par le JSON demandé.\n${JSON.stringify(payload)}` },
  ];
  const data = await chat(apiKey, messages);
  accumulateUsage(usage, data);
  const content = data?.choices?.[0]?.message?.content ?? '';
  const translations = parseBatchTranslations(content);
  if (!translations) throw new Error('Réponse de lot non analysable (JSON attendu).');
  return translations;
}

async function translateOne(apiKey, item, violationMessages, usage) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content:
        `La traduction de cet exercice a été refusée par le validateur. Corrige-la.\n` +
        `Nom anglais : ${item.name}\nMuscle ciblé : ${item.target || item.bodyPart}\nÉquipement : ${item.equipment}\n` +
        `Violations détectées :\n${violationMessages.map((m) => `- ${m}`).join('\n')}\n` +
        `Si ce nom est deja pris par un autre exercice, DISTINGUE-LE en precisant ce qui differe `+
        `reellement : un bras / deux bras, assis / debout, prise serree / large, angle, machine `+
        `convergente, banc decline... Ne renvoie JAMAIS un nom francais deja attribue.
` +
        `Réponds uniquement par : {"nameFr":"<traduction>"}`,
    },
  ];
  const data = await chat(apiKey, messages);
  accumulateUsage(usage, data);
  const content = data?.choices?.[0]?.message?.content ?? '';
  return parseSingleTranslation(content);
}

async function readProgress() {
  try {
    const arr = JSON.parse(await fs.readFile(PROGRESS, 'utf8'));
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function save(catalog, done) {
  await fs.writeFile(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
  await fs.writeFile(PROGRESS, JSON.stringify([...done]));
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const apiKey = readApiKey();

  const catalog = JSON.parse(await fs.readFile(CATALOG, 'utf8'));
  const done = await readProgress();

  // --only-fallbacks : ne retraite que les exercices dont nameFr est reste
  // egal au nom anglais (repli du validateur), pour rattraper ceux qu'une
  // regle trop stricte avait rejetes sans les retraduire.
  const todo = catalog.filter(
    (e) => !done.has(e.id) && (!opts.onlyFallbacks || (e.nameFr ?? '').trim() === e.name.trim())
  );
  const limited = opts.limit === Infinity ? todo : todo.slice(0, opts.limit);

  let translated = 0;
  let retried = 0;
  let fallback = 0;
  const warnings = [];
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 0 };

  if (limited.length === 0) {
    console.log('Rien à traduire : tous les noms sont déjà traités.');
    return;
  }

  const batches = chunk(limited, BATCH_SIZE);
  for (const batch of batches) {
    const batchIds = new Set(batch.map((e) => e.id));

    // 1) Traduction par lot (avec reprise propre en cas d'échec réseau/parsing).
    let results = null;
    for (let attempt = 1; attempt <= BATCH_ATTEMPTS && !results; attempt++) {
      try {
        results = await translateBatch(apiKey, batch, usage);
      } catch (err) {
        if (attempt === BATCH_ATTEMPTS) throw err;
        process.stderr.write(`  lot ${batch[0]?.id}… échec (${err.message}) — nouvelle tentative\n`);
      }
    }
    const byId = new Map(batch.map((e) => [e.id, e]));
    for (const t of results) {
      const item = byId.get(t?.id);
      const fr = cleanNameFr(t?.nameFr);
      if (item && fr) item.nameFr = fr;
    }

    // 2) Boucle de validation : renvoi individuel des entrées en violation.
    const view = () => catalog.filter((e) => done.has(e.id) || batchIds.has(e.id));
    for (let pass = 0; pass < MAX_RETRIES; pass++) {
      const violating = validateCatalog(view()).filter((v) => batchIds.has(v.id));
      if (violating.length === 0) break;
      const ids = new Set(violating.map((v) => v.id));
      for (const id of ids) {
        const item = byId.get(id);
        const messages = violating.filter((v) => v.id === id).map((v) => v.message);
        let fr = null;
        try {
          fr = await translateOne(apiKey, item, messages, usage);
        } catch (err) {
          process.stderr.write(`  reprise ${id} échouée (${err.message})\n`);
        }
        const cleaned = cleanNameFr(fr);
        if (cleaned) {
          item.nameFr = cleaned;
          retried++;
        }
      }
    }

    // 3) Repli : après 3 échecs, le nom anglais vaut mieux qu'un nom faux —
    // mais UNIQUEMENT sur les règles bloquantes (R1/R2/R4), qui sont objectives.
    // R3 est trop bruitée pour imposer l'anglais : « Floor Press » traduit par
    // « Développé couché au sol » est correct alors que la règle le rejette.
    // Les violations R3 restantes sont conservées et listées pour relecture.
    const remaining = validateCatalog(view()).filter((v) => batchIds.has(v.id));
    const blockingIds = new Set(remaining.filter(isBlocking).map((v) => v.id));
    for (const v of remaining) {
      if (!isBlocking(v)) warnings.push(v);
    }
    for (const item of batch) {
      if (blockingIds.has(item.id)) {
        item.nameFr = item.name;
        fallback++;
      } else {
        translated++;
      }
    }

    for (const item of batch) done.add(item.id);

    if (!opts.dryRun) await save(catalog, done);

    for (const item of batch) {
      process.stdout.write(`${item.id} | ${item.name} => ${item.nameFr}\n`);
    }
    process.stdout.write(`Progression : ${done.size}/${catalog.length}\n`);
  }

  if (!opts.dryRun) {
    await fs.rm(PROGRESS, { force: true });
  }

  const allRemaining = validateCatalog(catalog);
  const remainingViolations = allRemaining.filter(isBlocking).length;
  console.log(`\nTerminé : ${translated} traduits, ${retried} reprises, ${fallback} replis (nom anglais).`);
  console.log(`Usage API (tokens) : ${JSON.stringify(usage)}`);
  console.log(`Violations restantes sur le catalogue : ${remainingViolations}.`);
}

main().catch((err) => {
  console.error('ÉCHEC:', err.message);
  process.exit(1);
});

