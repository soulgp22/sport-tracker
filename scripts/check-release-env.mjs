#!/usr/bin/env node
/**
 * Garde avant publication : refuse un .env qui produirait un build publie
 * defectueux ou interdit.
 *
 * - Cle Test Store RevenueCat (`test_…`) : RevenueCat interdit de publier un
 *   build qui l'embarque. Elle sert UNIQUEMENT a tester l'achat sur
 *   l'emulateur.
 * - URL ou cle du serveur repas absente : l'analyse photo se desactive en
 *   silence (voir connexions.md, « Piege »).
 *
 * Usage : node scripts/check-release-env.mjs   (code de sortie 1 = ne pas publier)
 */
import { readFileSync } from 'node:fs';

function readEnv(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .filter((line) => /^[A-Z0-9_]+=/.test(line))
        .map((line) => {
          const index = line.indexOf('=');
          return [line.slice(0, index), line.slice(index + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const env = { ...readEnv('.env'), ...process.env };
const problems = [];

const revenueCatKey = env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
if (revenueCatKey.startsWith('test_')) {
  problems.push('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY est une cle Test Store : interdite dans un build publie.');
} else if (revenueCatKey && !revenueCatKey.startsWith('goog_')) {
  problems.push('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ne ressemble pas a une cle Android (goog_…).');
} else if (!revenueCatKey) {
  console.warn('Avertissement : pas de cle RevenueCat, l\'abonnement sera annonce « bientot disponible ».');
}

for (const name of ['EXPO_PUBLIC_MEAL_SERVER_URL', 'EXPO_PUBLIC_MEAL_SERVER_API_KEY']) {
  if (!env[name]) problems.push(`${name} est vide : l'analyse photo serait desactivee en silence.`);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`REFUS : ${problem}`);
  process.exit(1);
}
console.log('Environnement de publication conforme.');
