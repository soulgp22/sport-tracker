/*
 * Génère les programmes communautaires (catalogue de départ) dans community/.
 * Chaque programme est au format import de l'app { version:1, programs:[...] }.
 * Vérifie que chaque exercice référencé (par nom) se résout dans le catalogue
 * (même logique normalize que exerciseCatalogStore) AVANT d'écrire.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'src', 'data', 'exercises.catalog.json');
const OUT = path.join(ROOT, 'community');

const normalize = (v) =>
  (v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// helper de saisie : e(nom, reps, series, repos, [alternatives])
const set = (reps, weight, rest) => ({ reps, weight, restSeconds: rest });
const ex = (exerciseName, series, reps, rest, alternativeExerciseNames = []) => ({
  exerciseName,
  ...(alternativeExerciseNames.length ? { alternativeExerciseNames } : {}),
  sets: Array.from({ length: series }, () => set(reps, 0, rest)),
});

// ---- Définition des programmes ----
const PROGRAMS = [
  {
    id: 'full-body-3',
    name: 'Full Body Débutant',
    description: 'Programme corps entier 3 séances/semaine, idéal pour démarrer la muscu sur les mouvements de base.',
    author: 'Sport Tracker',
    level: 'Débutant',
    program: {
      name: 'Full Body Débutant',
      days: [
        { name: 'Séance A', exercises: [
          ex('Barbell Full Squat', 3, 8, 120, ['Leg Press']),
          ex('Barbell Bench Press - Medium Grip', 3, 8, 120, ['Dumbbell Bench Press']),
          ex('Bent Over Barbell Row', 3, 10, 90, ['Seated Cable Rows']),
          ex('Barbell Shoulder Press', 3, 10, 90),
          ex('Barbell Curl', 3, 12, 60),
        ]},
        { name: 'Séance B', exercises: [
          ex('Barbell Deadlift', 3, 6, 150, ['Romanian Deadlift']),
          ex('Incline Dumbbell Press', 3, 10, 90),
          ex('Wide-Grip Lat Pulldown', 3, 10, 90, ['Pullups']),
          ex('Side Lateral Raise', 3, 15, 60),
          ex('Triceps Pushdown', 3, 12, 60),
        ]},
        { name: 'Séance C', exercises: [
          ex('Leg Press', 3, 12, 120),
          ex('Dumbbell Bench Press', 3, 10, 90),
          ex('Chin-Up', 3, 8, 90, ['Wide-Grip Lat Pulldown']),
          ex('Seated Calf Raise', 4, 15, 45),
          ex('Crunches', 3, 20, 45),
        ]},
      ],
    },
  },
  {
    id: 'ppl-3',
    name: 'Push Pull Legs',
    description: 'Le grand classique : Poussée / Tirage / Jambes. À enchaîner 3 à 6 jours/semaine selon ta récup.',
    author: 'Sport Tracker',
    level: 'Intermédiaire',
    program: {
      name: 'Push Pull Legs',
      days: [
        { name: 'Push (Poussée)', exercises: [
          ex('Barbell Bench Press - Medium Grip', 4, 8, 120, ['Dumbbell Bench Press']),
          ex('Barbell Shoulder Press', 3, 10, 90, ['Machine Shoulder (Military) Press']),
          ex('Incline Dumbbell Press', 3, 10, 90),
          ex('Side Lateral Raise', 4, 15, 60),
          ex('Triceps Pushdown', 3, 12, 60),
        ]},
        { name: 'Pull (Tirage)', exercises: [
          ex('Barbell Deadlift', 3, 6, 150, ['Romanian Deadlift']),
          ex('Pullups', 4, 8, 120, ['Wide-Grip Lat Pulldown']),
          ex('Bent Over Barbell Row', 3, 10, 90, ['Seated Cable Rows']),
          ex('Wide-Grip Lat Pulldown', 3, 12, 90),
          ex('Barbell Curl', 3, 12, 60),
        ]},
        { name: 'Legs (Jambes)', exercises: [
          ex('Barbell Full Squat', 4, 8, 150, ['Leg Press']),
          ex('Romanian Deadlift', 3, 10, 120),
          ex('Leg Press', 3, 12, 120),
          ex('Leg Extensions', 3, 15, 60),
          ex('Lying Leg Curls', 3, 12, 60),
          ex('Seated Calf Raise', 4, 15, 45),
        ]},
      ],
    },
  },
  {
    id: 'upper-lower-4',
    name: 'Upper / Lower',
    description: 'Haut / Bas sur 4 séances : bon équilibre volume et récupération pour progresser en force.',
    author: 'Sport Tracker',
    level: 'Intermédiaire',
    program: {
      name: 'Upper / Lower',
      days: [
        { name: 'Upper A', exercises: [
          ex('Barbell Bench Press - Medium Grip', 4, 6, 120, ['Dumbbell Bench Press']),
          ex('Bent Over Barbell Row', 4, 8, 120, ['Seated Cable Rows']),
          ex('Barbell Shoulder Press', 3, 10, 90),
          ex('Wide-Grip Lat Pulldown', 3, 12, 90),
          ex('Barbell Curl', 3, 12, 60),
          ex('Triceps Pushdown', 3, 12, 60),
        ]},
        { name: 'Lower A', exercises: [
          ex('Barbell Full Squat', 4, 6, 150, ['Leg Press']),
          ex('Romanian Deadlift', 3, 10, 120),
          ex('Leg Press', 3, 12, 120),
          ex('Lying Leg Curls', 3, 12, 60),
          ex('Seated Calf Raise', 4, 15, 45),
        ]},
        { name: 'Upper B', exercises: [
          ex('Incline Dumbbell Press', 4, 8, 120),
          ex('Pullups', 4, 8, 120, ['Wide-Grip Lat Pulldown']),
          ex('Side Lateral Raise', 4, 15, 60),
          ex('Dumbbell Bench Press', 3, 10, 90),
          ex('Barbell Curl', 3, 12, 60),
        ]},
        { name: 'Lower B', exercises: [
          ex('Barbell Deadlift', 4, 5, 180, ['Romanian Deadlift']),
          ex('Barbell Hip Thrust', 3, 12, 90),
          ex('Leg Extensions', 3, 15, 60),
          ex('Lying Leg Curls', 3, 15, 60),
          ex('Seated Calf Raise', 4, 15, 45),
        ]},
      ],
    },
  },
];

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG, 'utf8'));
  const byName = new Map();
  for (const e of catalog) {
    byName.set(normalize(e.name), e);
    if (e.nameFr) byName.set(normalize(e.nameFr), e);
  }

  // Vérif : chaque exercice référencé se résout
  const unresolved = new Set();
  for (const p of PROGRAMS) {
    for (const d of p.program.days) {
      for (const e of d.exercises) {
        if (!byName.has(normalize(e.exerciseName))) unresolved.add(e.exerciseName);
        for (const alt of e.alternativeExerciseNames ?? []) {
          if (!byName.has(normalize(alt))) unresolved.add(`(alt) ${alt}`);
        }
      }
    }
  }
  if (unresolved.size) {
    console.error('EXERCICES NON RÉSOLUS:\n' + [...unresolved].map((x) => ' - ' + x).join('\n'));
    process.exit(1);
  }

  await fs.mkdir(OUT, { recursive: true });

  const manifest = { version: 1, programs: [] };
  for (const p of PROGRAMS) {
    const daysCount = p.program.days.length;
    const exercisesCount = p.program.days.reduce((s, d) => s + d.exercises.length, 0);
    const file = `${p.id}.json`;
    await fs.writeFile(path.join(OUT, file), JSON.stringify({ version: 1, programs: [p.program] }, null, 2) + '\n');
    manifest.programs.push({
      id: p.id, name: p.name, description: p.description, author: p.author,
      level: p.level, daysCount, exercisesCount, file,
    });
  }
  await fs.writeFile(path.join(OUT, 'index.json'), JSON.stringify(manifest, null, 2) + '\n');

  console.log(`✅ ${PROGRAMS.length} programmes écrits dans community/ (tous les exercices résolus)`);
  manifest.programs.forEach((p) => console.log(`   - ${p.name} (${p.daysCount}j, ${p.exercisesCount} exos)`));
}

main().catch((e) => { console.error('ÉCHEC:', e.message); process.exit(1); });
