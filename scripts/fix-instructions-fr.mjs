/**
 * Corrige la terminologie des instructions francaises du catalogue d'exercices.
 *
 * POURQUOI PAS UNE RETRADUCTION — le francais produit est globalement fluide et
 * correct. L'audit (873 exercices) n'a releve qu'un defaut systematique :
 * « banque » pour *bench*, 204 occurrences sur 109 exercices. Repasser les
 * 873 fiches dans un modele couterait cher, prendrait des heures et risquerait
 * de degrader du texte deja bon, pour corriger un probleme lexical. Des regles
 * deterministes sont plus sures, verifiables et rejouables.
 *
 * « rangee » (a row of cones) et « boucle » (the loop of a band) ont ete
 * verifies contre l'anglais : ce sont des traductions CORRECTES. Ne pas les
 * « corriger ».
 *
 * Usage :
 *   node scripts/fix-instructions-fr.mjs --dry-run
 *   node scripts/fix-instructions-fr.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.join(HERE, '..', 'src', 'data', 'exercises.catalog.json');

/**
 * Phase 0 — « banquette » est le meme defaut sous une autre forme. On le ramene
 * a « banque » pour que toutes les regles suivantes s'appliquent une seule fois.
 */
export const NORMALISE_RULES = [
  [/\bbanquettes\b/gi, 'banques'],
  [/\bbanquette\b/gi, 'banque'],
];

/**
 * Phase 1 — l'adjectif et le participe qui suivent le nom. Applique AVANT les
 * determinants : « banque » reste en place pour que ceux-ci matchent encore.
 * Le genre passe du feminin au masculin, d'ou tous les accords a refaire.
 * Du plus long au plus court : « banque inclinée réglée » avant
 * « banque inclinée », sinon le second participe resterait au feminin.
 */
export const ADJECTIVE_RULES = [
  [/banque inclinée réglée/gi, 'banque incliné réglé'],
  [/banque d'utilité équipée/gi, 'banque polyvalent équipé'],
  [/banque d'utilité dotée/gi, 'banque polyvalent doté'],
  [/banque d'élévation des jambes verticale/gi, 'banque vertical à relevé de jambes'],
  [/banque d'utilité/gi, 'banque polyvalent'],
  [/banque plate est utilisée/gi, 'banque plat est utilisé'],
  [/banque plate/gi, 'banque plat'],
  [/banque inclinée/gi, 'banque incliné'],
  [/banque déclinée/gi, 'banque décliné'],
  [/banque abdominale/gi, 'banque abdominal'],
];

/**
 * Phase 2 — le determinant. Du plus long au plus court : « de la banque » doit
 * etre traite avant « la banque », sinon on obtiendrait « de le banc ».
 *
 * Les frontieres de mot (\b) ne sont PAS decoratives : sans elles, /banque/
 * mordait a l'interieur de « banquette » et produisait « banctte ».
 */
export const DETERMINER_RULES = [
  [/de la \bbanque\b/gi, 'du banc'],
  [/à la \bbanque\b/gi, 'au banc'],
  [/la \bbanque\b/gi, 'le banc'],
  [/une \bbanque\b/gi, 'un banc'],
  [/cette \bbanque\b/gi, 'ce banc'],
  [/\bbanques\b/gi, 'bancs'],
  [/\bbanque\b/gi, 'banc'],
];

/** Corrections nominatives, verifiees une par une contre le texte anglais. */
export const EXACT_FIXES = [
  {
    id: 'offline-419',
    from: 'Kneel in front of the cable tower, taking the cable with one hand with your arm extended. This will be your starting position.',
    to: "Mettez-vous à genoux face à la colonne de poulie, saisissez la poignée d'une main, bras tendu. C'est votre position de départ.",
  },
  {
    id: 'offline-419',
    from: 'Attachez un seul poignée',
    to: 'Attachez une seule poignée',
  },
];

/** Applique toutes les regles a une chaine. */
export function fixText(text) {
  let out = text;
  for (const [re, to] of NORMALISE_RULES) out = out.replace(re, to);
  for (const [re, to] of ADJECTIVE_RULES) out = out.replace(re, to);
  for (const [re, to] of DETERMINER_RULES) out = out.replace(re, to);
  return out;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));

  let changedExercises = 0;
  let changedLines = 0;

  for (const exercise of catalog) {
    const lines = exercise.instructionsFr;
    if (!Array.isArray(lines)) continue;

    let touched = false;
    const next = lines.map((line) => {
      let out = fixText(line);
      for (const fix of EXACT_FIXES) {
        if (fix.id === exercise.id && out.includes(fix.from)) {
          out = out.replace(fix.from, fix.to);
        }
      }
      if (out !== line) {
        changedLines += 1;
        touched = true;
      }
      return out;
    });

    if (touched) {
      changedExercises += 1;
      exercise.instructionsFr = next;
    }
  }

  // Garde-fou : aucune occurrence ne doit survivre. Si une forme non prevue
  // existe, on veut le savoir ICI plutot que de la decouvrir a l'ecran.
  const leftovers = [];
  for (const exercise of catalog) {
    const text = (exercise.instructionsFr ?? []).join(' ');
    for (const m of text.matchAll(/.{0,40}(banque|banquette|banctte).{0,40}/gi)) {
      leftovers.push(`${exercise.id} … ${m[0].replace(/\s+/g, ' ')} …`);
    }
  }

  console.log(`${changedLines} lignes corrigees sur ${changedExercises} exercices.`);
  if (leftovers.length) {
    console.error(`\nECHEC : ${leftovers.length} occurrence(s) non traitee(s) :`);
    leftovers.slice(0, 10).forEach((l) => console.error('  ' + l));
    process.exit(1);
  }
  console.log('Aucune occurrence de « banque » ne subsiste.');

  if (dryRun) {
    console.log('\n--dry-run : le catalogue n a PAS ete ecrit.');
    return;
  }

  fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  console.log(`Catalogue ecrit : ${CATALOG}`);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}
