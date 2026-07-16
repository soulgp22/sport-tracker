import type { LanguageId } from '../i18n/translations';
import { useLanguageStore } from '../store/languageStore';
import type { CatalogExercise } from '../types';

const muscleLabels: Record<LanguageId, Record<string, string>> = {
  fr: {
    abdominals: 'Abdominaux',
    abductors: 'Abducteurs',
    adductors: 'Adducteurs',
    biceps: 'Biceps',
    calves: 'Mollets',
    chest: 'Pectoraux',
    forearms: 'Avant-bras',
    glutes: 'Fessiers',
    hamstrings: 'Ischio-jambiers',
    lats: 'Grand dorsal',
    'lower back': 'Lombaires',
    'middle back': 'Milieu du dos',
    neck: 'Cou',
    other: 'Autre',
    quadriceps: 'Quadriceps',
    shoulders: 'Épaules',
    traps: 'Trapèzes',
    triceps: 'Triceps',
  },
  en: {
    abdominals: 'Abdominals',
    abductors: 'Abductors',
    adductors: 'Adductors',
    biceps: 'Biceps',
    calves: 'Calves',
    chest: 'Chest',
    forearms: 'Forearms',
    glutes: 'Glutes',
    hamstrings: 'Hamstrings',
    lats: 'Lats',
    'lower back': 'Lower back',
    'middle back': 'Middle back',
    neck: 'Neck',
    other: 'Other',
    quadriceps: 'Quadriceps',
    shoulders: 'Shoulders',
    traps: 'Traps',
    triceps: 'Triceps',
  },
  es: {
    abdominals: 'Abdominales',
    abductors: 'Abductores',
    adductors: 'Aductores',
    biceps: 'Bíceps',
    calves: 'Gemelos',
    chest: 'Pectorales',
    forearms: 'Antebrazos',
    glutes: 'Glúteos',
    hamstrings: 'Isquiotibiales',
    lats: 'Dorsales',
    'lower back': 'Lumbares',
    'middle back': 'Espalda media',
    neck: 'Cuello',
    other: 'Otro',
    quadriceps: 'Cuádriceps',
    shoulders: 'Hombros',
    traps: 'Trapecios',
    triceps: 'Tríceps',
  },
  de: {
    abdominals: 'Bauchmuskeln',
    abductors: 'Abduktoren',
    adductors: 'Adduktoren',
    biceps: 'Bizeps',
    calves: 'Waden',
    chest: 'Brust',
    forearms: 'Unterarme',
    glutes: 'Gesäß',
    hamstrings: 'Beinbeuger',
    lats: 'Latissimus',
    'lower back': 'Unterer Rücken',
    'middle back': 'Mittlerer Rücken',
    neck: 'Nacken',
    other: 'Andere',
    quadriceps: 'Quadrizeps',
    shoulders: 'Schultern',
    traps: 'Trapezmuskel',
    triceps: 'Trizeps',
  },
};

const equipmentLabels: Record<LanguageId, Record<string, string>> = {
  fr: {
    bands: 'Élastiques',
    barbell: 'Barre',
    'body only': 'Poids du corps',
    cable: 'Poulie',
    dumbbell: 'Haltères',
    'e-z curl bar': 'Barre EZ',
    'exercise ball': 'Swiss ball',
    'foam roll': 'Rouleau',
    kettlebell: 'Kettlebell',
    kettlebells: 'Kettlebells',
    machine: 'Machine',
    'medicine ball': 'Médecine-ball',
    other: 'Autre matériel',
  },
  en: {
    bands: 'Bands',
    barbell: 'Barbell',
    'body only': 'Bodyweight',
    cable: 'Cable',
    dumbbell: 'Dumbbells',
    'e-z curl bar': 'EZ curl bar',
    'exercise ball': 'Exercise ball',
    'foam roll': 'Foam roller',
    kettlebell: 'Kettlebell',
    kettlebells: 'Kettlebells',
    machine: 'Machine',
    'medicine ball': 'Medicine ball',
    other: 'Other equipment',
  },
  es: {
    bands: 'Bandas elásticas',
    barbell: 'Barra',
    'body only': 'Peso corporal',
    cable: 'Polea',
    dumbbell: 'Mancuernas',
    'e-z curl bar': 'Barra EZ',
    'exercise ball': 'Fitball',
    'foam roll': 'Rodillo de espuma',
    kettlebell: 'Kettlebell',
    kettlebells: 'Kettlebells',
    machine: 'Máquina',
    'medicine ball': 'Balón medicinal',
    other: 'Otro material',
  },
  de: {
    bands: 'Widerstandsbänder',
    barbell: 'Langhantel',
    'body only': 'Körpergewicht',
    cable: 'Kabelzug',
    dumbbell: 'Kurzhanteln',
    'e-z curl bar': 'SZ-Stange',
    'exercise ball': 'Gymnastikball',
    'foam roll': 'Faszienrolle',
    kettlebell: 'Kettlebell',
    kettlebells: 'Kettlebells',
    machine: 'Maschine',
    'medicine ball': 'Medizinball',
    other: 'Anderes Gerät',
  },
};

type ExerciseAlias = Partial<Record<LanguageId, string[]>>;

export const exerciseAliases: Record<string, ExerciseAlias> = {
  'offline-205': {
    fr: ['Pec deck', 'Butterfly machine'],
    en: ['Pec deck', 'Chest fly machine'],
    es: ['Contractora de pecho', 'Pec deck'],
    de: ['Butterfly-Maschine', 'Pec Deck'],
  },
  'offline-307': {
    fr: ['Hip thrust', 'Glute drive'],
    en: ['Hip thrust', 'Glute drive'],
    es: ['Empuje de cadera', 'Glute drive'],
    de: ['Hip Thrust', 'Glute Drive'],
  },
  'offline-075': {
    fr: ['Hip thrust guidé', 'Machine à fessiers'],
    en: ['Smith hip thrust', 'Glute drive machine'],
    es: ['Hip thrust guiado', 'Máquina de glúteos'],
    de: ['Geführter Hip Thrust', 'Glute-Maschine'],
  },
  'offline-561': {
    fr: ['Hack squat machine'],
    en: ['Hack squat machine'],
    es: ['Máquina hack squat'],
    de: ['Hackenschmidt-Maschine'],
  },
  'offline-822': {
    fr: ['Dips assistés', 'Machine à dips'],
    en: ['Assisted dip', 'Dip machine'],
    es: ['Fondos asistidos', 'Máquina de fondos'],
    de: ['Unterstützte Dips', 'Dip-Maschine'],
  },
  'offline-406': {
    fr: ['Tractions assistées'],
    en: ['Assisted pull-up'],
    es: ['Dominadas asistidas'],
    de: ['Unterstützte Klimmzüge'],
  },
  'offline-250': {
    fr: ['Presse pectorale convergente'],
    en: ['Plate-loaded chest press'],
    es: ['Press de pecho convergente'],
    de: ['Konvergierende Brustpresse'],
  },
  'offline-483': {
    fr: ['High row machine', 'Tirage convergent'],
    en: ['High row machine', 'Iso-lateral row'],
    es: ['Remo alto en máquina'],
    de: ['High-Row-Maschine'],
  },
  'offline-574': {
    fr: ['Presse à cuisses'],
    en: ['Leg press machine'],
    es: ['Prensa de piernas'],
    de: ['Beinpresse'],
  },
  'offline-386': {
    fr: ['Leg curl assis'],
    en: ['Seated hamstring curl'],
    es: ['Curl femoral sentado'],
    de: ['Sitzender Beinbeuger'],
  },
  'offline-573': {
    fr: ['Leg extension'],
    en: ['Leg extension machine'],
    es: ['Extensión de piernas'],
    de: ['Beinstrecker'],
  },
  'offline-643': {
    fr: ['Escalier', 'Stair climber'],
    en: ['Stair climber', 'Stepmill'],
    es: ['Escaladora'],
    de: ['Treppensteiger', 'Stepmill'],
  },
};

function currentLanguage(language?: LanguageId) {
  return language ?? useLanguageStore.getState().language;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function capitalizeFallback(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function translateMuscle(
  value: string | null | undefined,
  language?: LanguageId
) {
  if (!value) return '';
  const selectedLanguage = currentLanguage(language);
  return (
    muscleLabels[selectedLanguage][normalizeKey(value)] ??
    muscleLabels.en[normalizeKey(value)] ??
    capitalizeFallback(value)
  );
}

export function translateEquipment(
  value: string | null | undefined,
  language?: LanguageId
) {
  if (!value) return '';
  const selectedLanguage = currentLanguage(language);
  return (
    equipmentLabels[selectedLanguage][normalizeKey(value)] ??
    equipmentLabels.en[normalizeKey(value)] ??
    capitalizeFallback(value)
  );
}

export function getExerciseDisplayName(
  exercise: Pick<CatalogExercise, 'name' | 'nameFr'>,
  language?: LanguageId
) {
  return currentLanguage(language) === 'fr' ? exercise.nameFr?.trim() || exercise.name : exercise.name;
}

export function getExerciseDisplayInstructions(
  exercise: Pick<CatalogExercise, 'instructions' | 'instructionsFr'>,
  language?: LanguageId
) {
  if (currentLanguage(language) === 'fr' && exercise.instructionsFr?.length) {
    return exercise.instructionsFr;
  }
  return exercise.instructions;
}

export function getExerciseAliases(id: string, language?: LanguageId) {
  const aliases = exerciseAliases[id];
  if (!aliases) return [];
  const selectedLanguage = currentLanguage(language);
  return aliases[selectedLanguage] ?? aliases.en ?? [];
}

export function getExerciseSearchAliases(id: string) {
  const aliases = exerciseAliases[id];
  if (!aliases) return [];
  return [...new Set(Object.values(aliases).flatMap((values) => values ?? []))];
}
