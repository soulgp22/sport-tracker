/*
 * Re-traduit UNIQUEMENT les noms d'exercices (nameFr) avec un prompt strict
 * (few-shot + muscle ciblé comme garde-fou) pour corriger les confusions de
 * mouvement (squat/curl/développé...). Garde instructionsFr inchangé.
 * Ollama local (qwen3:14b, think:false). Reprise via sidecar de progression.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'src', 'data', 'exercises.catalog.json');
const PROGRESS = path.join(ROOT, '.retranslate-names.progress.json');
const OLLAMA = process.env.OLLAMA_URL ?? 'http://localhost:11434/api/generate';
const MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:14b';
const SAVE_EVERY = 20;

const FEWSHOT = `Exemples (nom anglais [muscle] => nom français) :
Barbell Full Squat [quadriceps] => Squat complet à la barre
Barbell Bench Press - Medium Grip [chest] => Développé couché à la barre - Prise moyenne
Barbell Curl [biceps] => Curl à la barre
Reverse Barbell Curl [biceps] => Curl inversé à la barre
Barbell Deadlift [lower back] => Soulevé de terre à la barre
Bent Over Barbell Row [middle back] => Rowing barre buste penché
Dumbbell Lateral Raise [shoulders] => Élévation latérale aux haltères
Lat Pulldown [lats] => Tirage vertical
Leg Extension [quadriceps] => Extension des jambes (leg extension)
Seated Barbell Wrist Curl [forearms] => Curl des poignets à la barre, assis`;

const buildPrompt = (e) => `Tu traduis des NOMS d'exercices de musculation de l'anglais vers le français.
RÈGLE ABSOLUE : le type de mouvement doit correspondre. squat=>Squat, deadlift=>Soulevé de terre, bench press=>Développé couché, shoulder/military press=>Développé militaire, curl=>Curl, wrist curl=>Curl des poignets, row=>Rowing, lateral raise=>Élévation latérale, front raise=>Élévation frontale, pulldown=>Tirage vertical, pull-up/chin-up=>Traction, push-up=>Pompe, lunge=>Fente, extension=>Extension, calf raise=>Extension mollets, dip=>Dips, fly=>Écarté, shrug=>Haussement d'épaules, crunch=>Crunch, sit-up=>Relevé de buste. Équipement : barbell=>à la barre, dumbbell=>aux haltères, cable=>à la poulie, machine=>à la machine, kettlebell=>au kettlebell, smith machine=>à la Smith machine.
Ne mets JAMAIS "Développé" pour un squat, un curl, un soulevé de terre ou un tirage.
${FEWSHOT}
Réponds UNIQUEMENT par le nom français, une seule ligne, sans guillemets ni explication.
Nom anglais : ${e.name}
Muscle ciblé : ${e.target || e.bodyPart}
Nom français :`;

async function translateName(e) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch(OLLAMA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, stream: false, think: false, options: { temperature: 0.1 }, prompt: buildPrompt(e) }),
      });
      const d = await r.json();
      const out = String(d.response ?? '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .trim()
        .split(/\r?\n/)
        .map((l) => l.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean)
        .pop() || '';
      if (out && out.length >= 2 && out.length <= 120) return out;
    } catch {
      // retry
    }
  }
  return null;
}

async function readProgress() {
  try { return new Set(JSON.parse(await fs.readFile(PROGRESS, 'utf8'))); } catch { return new Set(); }
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG, 'utf8'));
  const done = await readProgress();
  let processed = 0, kept = 0, unsaved = 0;
  const total = catalog.length;

  for (let i = 0; i < catalog.length; i++) {
    const e = catalog[i];
    if (done.has(e.id)) continue;

    const fr = await translateName(e);
    if (fr) { e.nameFr = fr; } else { kept++; } // échec => garde l'ancien nameFr
    done.add(e.id);
    processed++; unsaved++;

    if (unsaved >= SAVE_EVERY) {
      await fs.writeFile(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
      await fs.writeFile(PROGRESS, JSON.stringify([...done]));
      unsaved = 0;
      process.stdout.write(`${done.size}/${total} (échecs gardés: ${kept})\n`);
    }
  }

  await fs.writeFile(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
  await fs.rm(PROGRESS, { force: true });
  console.log(`Terminé: ${processed} noms re-traduits (${kept} échecs gardés en l'état).`);
}

main().catch((e) => { console.error('ÉCHEC:', e.message); process.exit(1); });
