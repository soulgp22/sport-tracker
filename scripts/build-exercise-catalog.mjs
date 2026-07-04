/*
 * Construit le catalogue d'exercices OFFLINE à partir de free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db, domaine public, sans rate-limit).
 * Télécharge les vraies images dans assets/exercises/gifs/ et génère :
 *   - src/data/exercises.catalog.json
 *   - src/data/exercises.gifs.ts
 * Deux frames réelles par exercice (départ/arrivée quand disponible).
 * PAS de fallback placeholder.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'assets', 'exercises', 'gifs');
const CATALOG = path.join(ROOT, 'src', 'data', 'exercises.catalog.json');
const GIFS_TS = path.join(ROOT, 'src', 'data', 'exercises.gifs.ts');

const RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const DATA_URL = `${RAW}/dist/exercises.json`;
const IMG_BASE = `${RAW}/exercises`;
const TARGET = 250;
const COMMON_EQUIP = ['barbell', 'dumbbell', 'machine', 'cable', 'body only', 'kettlebell', 'e-z curl bar'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normName = (n) => (n ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function getBuf(url) {
  for (let a = 0; a < 5; a++) {
    let res;
    try { res = await fetch(url); } catch { await sleep(1500 * (a + 1)); continue; }
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * (a + 1)); continue; }
    if (!res.ok) throw new Error(`http ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error('échecs répétés');
}

function curate(all) {
  // catalogue COMPLET : tous les exercices uniques (par nom) ayant une image,
  // triés par groupe musculaire puis nom pour un ordre stable.
  const seen = new Set();
  const uniq = [];
  for (const e of all) {
    const k = normName(e.name);
    if (!k || seen.has(k) || !(e.images && e.images.length)) continue;
    seen.add(k);
    uniq.push(e);
  }
  uniq.sort((a, b) => {
    const ka = `${a.primaryMuscles?.[0] ?? 'zz'} ${a.name}`;
    const kb = `${b.primaryMuscles?.[0] ?? 'zz'} ${b.name}`;
    return ka.localeCompare(kb);
  });
  console.log(`catalogue complet: ${uniq.length} exercices uniques avec image`);
  return uniq;
}

function mapFields(e) {
  return {
    name: e.name ?? '',
    bodyPart: e.primaryMuscles?.[0] ?? 'other',
    target: e.primaryMuscles?.[0] ?? 'other',
    secondaryMuscles: e.secondaryMuscles ?? [],
    equipment: e.equipment ?? 'body only',
    instructions: e.instructions ?? [],
    _imgA: e.images[0],
    _imgB: e.images[1],
  };
}

async function main() {
  console.log('Téléchargement du dataset free-exercise-db...');
  const all = JSON.parse((await getBuf(DATA_URL)).toString('utf8'));
  console.log(`dataset: ${all.length} exercices`);
  const picked = curate(all).map(mapFields);

  await fs.rm(IMG_DIR, { recursive: true, force: true });
  await fs.mkdir(IMG_DIR, { recursive: true });

  let total = 0;
  const ok = [];
  for (const ex of picked) {
    try {
      const bufA = await getBuf(`${IMG_BASE}/${ex._imgA}`);
      if (bufA.length < 800) throw new Error(`image A trop petite (${bufA.length}o)`);
      const bufB = ex._imgB ? await getBuf(`${IMG_BASE}/${ex._imgB}`) : bufA;
      if (bufB.length < 800) throw new Error(`image B trop petite (${bufB.length}o)`);

      const tmpA = `tmp-${ok.length}-a.jpg`;
      const tmpB = `tmp-${ok.length}-b.jpg`;
      await fs.writeFile(path.join(IMG_DIR, tmpA), bufA);
      await fs.writeFile(path.join(IMG_DIR, tmpB), bufB);
      ok.push({ ...ex, _tmpA: tmpA, _tmpB: tmpB });
      total += bufA.length + bufB.length;
      process.stdout.write(`\rimages ${ok.length}/${picked.length} (${(total / 1e6).toFixed(1)} Mo)`);
    } catch (err) {
      process.stdout.write(`\n  skip ${ex.name}: ${err.message}\n`);
    }
    await sleep(60);
  }
  process.stdout.write('\n');
  if (ok.length < 100) throw new Error(`trop peu d'images (${ok.length})`);

  const final = [];
  for (let i = 0; i < ok.length; i++) {
    const id = `offline-${String(i + 1).padStart(3, '0')}`;
    const fileA = `${id}-a.jpg`;
    const fileB = `${id}-b.jpg`;
    await fs.rename(path.join(IMG_DIR, ok[i]._tmpA), path.join(IMG_DIR, fileA));
    await fs.rename(path.join(IMG_DIR, ok[i]._tmpB), path.join(IMG_DIR, fileB));
    const { _imgA, _imgB, _tmpA, _tmpB, ...rest } = ok[i];
    final.push({ id, ...rest, gif: { a: fileA, b: fileB } });
  }

  await fs.writeFile(CATALOG, JSON.stringify(final, null, 2));
  const lines = final
    .map((e) => `  '${e.id}': { a: require('../../assets/exercises/gifs/${e.gif.a}'), b: require('../../assets/exercises/gifs/${e.gif.b}') },`)
    .join('\n');
  await fs.writeFile(
    GIFS_TS,
    `/* Généré par scripts/build-exercise-catalog.mjs — données free-exercise-db (domaine public). */\n\nexport const exerciseGifs: Record<string, { a: number; b: number }> = {\n${lines}\n};\n`,
  );

  console.log(`\n✅ Catalogue: ${final.length} exercices, images ${(total / 1e6).toFixed(1)} Mo`);
  const bp = [...new Set(final.map((e) => e.bodyPart))].sort();
  console.log(`   groupes: ${bp.join(', ')}`);
  console.log(`   offline-001 = ${final[0]?.name}`);
}

main().catch((e) => { console.error('\nÉCHEC:', e.message); process.exit(1); });
