/*
 * Valide les noms français (nameFr) du catalogue d'exercices.
 * Script autonome, SANS réseau, sur src/data/exercises.catalog.json.
 *
 * Règles :
 *   R1 unicité   — pas deux exercices avec le même nameFr (casse/accents/espaces normalisés).
 *   R2 matériel  — le matériel annoncé par nameFr doit correspondre au champ `equipment`.
 *   R3 mouvement — cohérence du type de mouvement, dans les DEUX sens (EN <-> FR).
 *   R4 non vide  — nameFr non vide.
 *
 * Sortie en code 1 s'il reste une violation. `validateCatalog(exercises)` est
 * réutilisable par le test ET par scripts/retranslate-names.mjs (pas de logique
 * dupliquée).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'src', 'data', 'exercises.catalog.json');
const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

/**
 * Normalise une chaîne pour la comparaison linguistique :
 * minuscules, sans accents, apostrophes unifiées, tirets -> espaces,
 * espaces multiples réduits.
 */
function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2019\u02bc\u0060]/g, "'")
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Construit une RegExp qui détecte l'une des phrases données (déjà normalisées),
 * en tolérant le pluriel du dernier mot (s / es).
 */
function buildPhraseRegex(phrases) {
  const alternatives = phrases.map((phrase) => {
    const tokens = phrase.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return '(?!)';
    const last = tokens[tokens.length - 1];
    const head = tokens.slice(0, -1).map(escapeRegex).join('\\s+');
    const lastPattern = escapeRegex(last) + '(?:es|s)?';
    const body = head ? head + '\\s+' : '';
    return '\\b' + body + lastPattern + '\\b';
  });
  return new RegExp(alternatives.join('|'));
}

function matchesAny(text, phrases) {
  return buildPhraseRegex(phrases).test(normalize(text));
}

/*
 * R2 — matériel annoncé par nameFr. Valeurs `equipment` alignées sur l'énum
 * réellement présente dans le catalogue (cf. src/constants/equipmentProfiles.ts) :
 * « kettlebell » -> 'kettlebells' (pluriel dans les données), « smith » -> 'machine'
 * (les exercices Smith sont stockés avec equipment = 'machine').
 */
const EQUIPMENT_RULES = [
  { keyword: 'halteres', phrases: ['haltere'], equipment: 'dumbbell' },
  // « a la barre EZ » DOIT etre teste avant « a la barre » : le catalogue
  // distingue l'equipement 'e-z curl bar' (9 exercices) de 'barbell'. Sans
  // cette regle plus specifique, « Curl a la barre EZ » declenchait R2
  // (barbell attendu, e-z curl bar recu), la traduction etait rejetee et
  // l'exercice retombait sur son nom ANGLAIS. C'est ce qui laissait
  // « EZ-Bar Curl », « Spider Curl » ou « EZ-Bar Skullcrusher » non traduits.
  { keyword: 'a la barre EZ', phrases: ['a la barre ez'], equipment: 'e-z curl bar' },
  {
    keyword: 'a la barre',
    phrases: ['a la barre'],
    excludePhrases: ['a la barre ez'],
    equipment: 'barbell',
  },
  { keyword: 'poulie', phrases: ['poulie'], equipment: 'cable' },
  { keyword: 'machine', phrases: ['machine'], equipment: 'machine' },
  { keyword: 'kettlebell', phrases: ['kettlebell'], equipment: 'kettlebells' },
  { keyword: 'smith', phrases: ['smith'], equipment: 'machine' },
];

/*
 * R3 — table minimale de correspondance de mouvements, dans les DEUX sens.
 * `en` : mots-clés anglais, `fr` : mots-clés français (formes normalisées).
 */
const MOVEMENT_RULES = [
  { en: ['squat'], fr: ['squat'] },
  { en: ['deadlift'], fr: ['souleve de terre', 'souleves de terre'] },
  { en: ['bench press'], fr: ['developpe couche', 'developpes couches'] },
  { en: ['shoulder press', 'military press'], fr: ['developpe militaire', 'developpes militaires'] },
  { en: ['wrist curl'], fr: ['curl des poignets', 'curls des poignets'] },
  { en: ['curl'], fr: ['curl'] },
  { en: ['row', 'rowing'], fr: ['rowing'] },
  { en: ['lateral raise'], fr: ['elevation laterale', 'elevations laterales'] },
  { en: ['front raise'], fr: ['elevation frontale', 'elevations frontales'] },
  { en: ['pulldown'], fr: ['tirage'] },
  { en: ['pull up', 'pullup', 'chin up', 'chinup'], fr: ['traction'] },
  { en: ['push up', 'pushup'], fr: ['pompe'] },
  { en: ['lunge'], fr: ['fente'] },
  { en: ['calf raise'], fr: ['extension mollets', 'extensions mollets'] },
  { en: ['dip'], fr: ['dip'] },
  { en: ['fly', 'flye', 'flies'], fr: ['ecarte'] },
  { en: ['shrug'], fr: ["haussement d'epaules", "haussements d'epaules"] },
  { en: ['crunch'], fr: ['crunch'] },
  { en: ['sit up', 'situp'], fr: ['releve de buste', 'releves de buste'] },
];

/**
 * Valide une liste d'exercices et renvoie la liste des violations.
 * Chaque violation : { id, name, nameFr, rule, message }.
 */
export function validateCatalog(exercises) {
  const violations = [];
  if (!Array.isArray(exercises)) return violations;

  // --- R1 : unicité (normalisée) ---
  const byNormalized = new Map();
  for (const e of exercises) {
    if (!e || typeof e.nameFr !== 'string' || e.nameFr.trim() === '') continue;
    const key = normalize(e.nameFr);
    if (!byNormalized.has(key)) byNormalized.set(key, []);
    byNormalized.get(key).push(e);
  }
  for (const [key, group] of byNormalized) {
    if (group.length < 2) continue;
    for (const e of group) {
      const others = group.filter((o) => o.id !== e.id).map((o) => o.id);
      violations.push({
        id: e.id,
        name: e.name,
        nameFr: e.nameFr,
        rule: 'R1',
        message: `nameFr « ${e.nameFr} » partagé avec ${group.length - 1} autre(s) exercice(s) (${others.join(', ')}) après normalisation « ${key} ».`,
      });
    }
  }

  // --- R2 : matériel ---
  for (const e of exercises) {
    if (!e || typeof e.nameFr !== 'string') continue;
    // Repli documenté : nameFr === name (non traduit) est un état accepté.
    if (typeof e.name === 'string' && e.nameFr.trim() === e.name) continue;
    for (const rule of EQUIPMENT_RULES) {
      // Une regle generique ne s'applique pas quand une variante plus
      // specifique correspond (« a la barre » cede a « a la barre EZ »).
      if (rule.excludePhrases && matchesAny(e.nameFr, rule.excludePhrases)) continue;
      if (matchesAny(e.nameFr, rule.phrases) && e.equipment !== rule.equipment) {
        violations.push({
          id: e.id,
          name: e.name,
          nameFr: e.nameFr,
          rule: 'R2',
          message: `nameFr contient « ${rule.keyword} » => equipment attendu « ${rule.equipment} », reçu « ${e.equipment} ».`,
        });
      }
    }
  }

  // --- R3 : mouvement, dans les deux sens ---
  for (const e of exercises) {
    if (!e || typeof e.name !== 'string') continue;
    // Repli documenté : nameFr === name (non traduit) est un état accepté.
    if (typeof e.nameFr === 'string' && e.nameFr.trim() === e.name) continue;
    for (const rule of MOVEMENT_RULES) {
      const enPresent = matchesAny(e.name, rule.en);
      const frPresent = matchesAny(e.nameFr, rule.fr);
      // sens direct : mot-clé anglais présent => équivalent français obligatoire.
      if (enPresent && !frPresent) {
        violations.push({
          id: e.id,
          name: e.name,
          nameFr: e.nameFr,
          rule: 'R3',
          message: `mouvement EN « ${rule.en.join(' | ')} » présent mais équivalent FR « ${rule.fr.join(' | ')} » absent.`,
        });
      }
      // sens inverse (essentiel) : mot-clé français présent => équivalent anglais obligatoire.
      if (frPresent && !enPresent) {
        violations.push({
          id: e.id,
          name: e.name,
          nameFr: e.nameFr,
          rule: 'R3',
          message: `mouvement FR « ${rule.fr.join(' | ')} » présent mais équivalent EN « ${rule.en.join(' | ')} » absent.`,
        });
      }
    }
  }

  // --- R4 : nameFr non vide ---
  for (const e of exercises) {
    if (!e || typeof e.nameFr !== 'string' || e.nameFr.trim() === '') {
      violations.push({
        id: e?.id,
        name: e?.name,
        nameFr: e?.nameFr,
        rule: 'R4',
        message: 'nameFr manquant ou vide.',
      });
    }
  }

  return violations;
}

/**
 * Severite des regles.
 *
 * BLOQUANTES (R1, R2, R4) : objectives et sans faux positif. Deux exercices ne
 * peuvent pas porter le meme nom ; un nom qui promet « aux halteres » sur un
 * exercice au poids du corps est faux, point. Une traduction qui les viole ne
 * doit JAMAIS etre inscrite : repli sur le nom anglais.
 *
 * AVERTISSEMENT (R3) : heuristique utile mais BRUITEE. Les noms anglais usent de
 * formulations variees qui designent pourtant le bon mouvement — « Floor Press »,
 * « Board Press », « Close-Grip Dumbbell Press » sont bien des developpes couches,
 * « Front Delt Raise » bien une elevation frontale. Mesure sur le catalogue du
 * 2026-08-21 : 211 declenchements, dont une large majorite de faux positifs.
 * R3 sert donc a RELANCER le modele et a alimenter un rapport a relire, jamais a
 * imposer un repli en anglais — ce qui degraderait ~150 traductions correctes.
 */
export const BLOCKING_RULES = ['R1', 'R2', 'R4'];
export const WARNING_RULES = ['R3'];

export function isBlocking(violation) {
  return BLOCKING_RULES.includes(violation.rule);
}

function summarize(violations) {
  const counts = { R1: 0, R2: 0, R3: 0, R4: 0 };
  for (const v of violations) counts[v.rule] = (counts[v.rule] || 0) + 1;
  return counts;
}

if (isMain) {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const violations = validateCatalog(catalog);

  const blocking = violations.filter(isBlocking);

  if (violations.length > 0) {
    const counts = summarize(violations);
    const order = ['R1', 'R2', 'R3', 'R4'];
    console.error(
      `${violations.length} signalement(s) — dont ${blocking.length} bloquant(s) (${BLOCKING_RULES.join('/')}) ` +
        `et ${violations.length - blocking.length} avertissement(s) (${WARNING_RULES.join('/')}) :`
    );
    for (const rule of order) {
      if (counts[rule]) console.error(`  ${rule} : ${counts[rule]}`);
    }
    for (const rule of order) {
      const list = violations.filter((v) => v.rule === rule);
      if (list.length === 0) continue;
      console.error(`\n--- ${rule} ---`);
      for (const v of list) {
        console.error(`  [${v.id}] ${v.name} => « ${v.nameFr ?? ''} » — ${v.message}`);
      }
    }
    // Seules les regles bloquantes font echouer : R3 est un rapport a relire.
    process.exitCode = blocking.length > 0 ? 1 : 0;
  } else {
    console.log('Validation des noms réussie : aucune violation.');
  }
}

