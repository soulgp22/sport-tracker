import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  COMMUNITY_BASE_URL,
  COMMUNITY_MANIFEST_CACHE_KEY,
  COMMUNITY_MANIFEST_URL,
} from '../constants/community';
import { assertImportTextSize, MAX_IMPORT_FILE_BYTES } from '../lib/importLimits';
import type { CatalogExercise, ImportResult } from '../types';
import type { ImportFoodsResult } from './foodStore';
import { useFoodStore } from './foodStore';
import { useProgramStore } from './programStore';
import { useExerciseCatalogStore } from './exerciseCatalogStore';
import { EQUIPMENT_PROFILES, type EquipmentProfile } from '../constants/equipmentProfiles';
import type { LanguageId } from '../i18n/translations';
import { translate } from '../i18n/translations';
import type { EquipmentProfileId } from '../types/equipment';

export type CommunityProgramLevel = 'beginner' | 'intermediate' | 'advanced';

/** Objet de variantes i18n : chaque langue est optionnelle, fallback sur le français. */
export type I18nMap = Partial<Record<Exclude<LanguageId, 'fr'>, string>>;

export interface CommunityProgramEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  level: CommunityProgramLevel;
  daysCount: number;
  exercisesCount?: number;
  file: string;
  goal?: string;
  equipment?: string;
  equipmentProfileIds?: EquipmentProfileId[];
  sessionsPerWeek?: number;
  sessionMinutes?: number;
  progression?: string;
  tags?: string[];
  nameI18n?: I18nMap;
  descriptionI18n?: I18nMap;
  goalI18n?: I18nMap;
  progressionI18n?: I18nMap;
}

export type CommunityFoodFormat = 'json' | 'csv';

export interface CommunityFoodDatabaseEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  retailer?: string;
  country?: string;
  retailers?: string[];
  foodsCount: number;
  format: CommunityFoodFormat;
  file: string;
  disclaimer: string;
  license?: string;
  attribution?: string;
  nameI18n?: I18nMap;
  descriptionI18n?: I18nMap;
}

export interface CommunityExercisePackEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  level: string;
  exercisesCount: number;
  file: string;
  mediaBaseUrl: string;
}

export interface CommunityManifest {
  version: 1 | 2 | 3;
  programs: CommunityProgramEntry[];
  foodDatabases: CommunityFoodDatabaseEntry[];
  exercisePacks?: CommunityExercisePackEntry[];
}

interface CommunityState {
  data: CommunityManifest | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  fetchManifest: () => Promise<CommunityManifest | null>;
  downloadProgram: (entry: CommunityProgramEntry) => Promise<ImportResult>;
  downloadFoodDatabase: (entry: CommunityFoodDatabaseEntry) => Promise<ImportFoodsResult>;
  downloadExercisePack: (entry: CommunityExercisePackEntry) => Promise<number>;
}

const COMMUNITY_LEVELS: CommunityProgramLevel[] = ['beginner', 'intermediate', 'advanced'];
const OFFLINE_CACHE_MESSAGE = 'community.offlineBanner';
const LOAD_ERROR_MESSAGE = 'community.loadError';
const DOWNLOAD_ERROR_MESSAGE = 'community.programDownloadFailed';
const MAX_COMMUNITY_PROGRAMS = 200;
const MAX_COMMUNITY_FOOD_DATABASES = 100;
const MAX_COMMUNITY_EXERCISE_PACKS = 20;
const SAFE_COMMUNITY_FILE_PATTERN = /^[a-z0-9][a-z0-9._-]*\.(json|csv)$/i;

function normalizeLevel(raw: unknown): CommunityProgramLevel {
  if (typeof raw !== 'string') return 'beginner';
  const normalized = raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .toLowerCase();
  const LEGACY_MAP: Record<string, CommunityProgramLevel> = {
    'débutant': 'beginner',
    'debutant': 'beginner',
    'intermédiaire': 'intermediate',
    'intermediaire': 'intermediate',
    'avancé': 'advanced',
    'avance': 'advanced',
  };
  if (LEGACY_MAP[normalized] !== undefined) return LEGACY_MAP[normalized];
  if (COMMUNITY_LEVELS.includes(normalized as CommunityProgramLevel)) {
    return normalized as CommunityProgramLevel;
  }
  return 'beginner'; // repli par défaut
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Manifeste communautaire invalide.');
  }

  return value.trim();
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  if (!(key in record)) return undefined;
  return readString(record, key);
}

function readOptionalCount(
  record: Record<string, unknown>,
  key: string,
  minimum: number
): number | undefined {
  if (!(key in record)) return undefined;
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum) {
    return undefined;
  }
  return value;
}

function readOptionalTags(record: Record<string, unknown>): string[] | undefined {
  if (!('tags' in record)) return undefined;
  const value = record.tags;
  if (
    !Array.isArray(value) ||
    value.length > 20 ||
    value.some((tag) => typeof tag !== 'string' || tag.trim().length === 0)
  ) {
    return undefined;
  }

  return value.map((tag) => (tag as string).trim());
}

function readOptionalI18nMap(
  record: Record<string, unknown>,
  key: string
): I18nMap | undefined {
  if (!(key in record)) return undefined;
  const value = record[key];
  if (!isRecord(value)) return undefined;
  const map: I18nMap = {};
  let hasAny = false;
  for (const lang of ['en', 'es', 'de'] as const) {
    if (lang in value) {
      const v = (value as Record<string, unknown>)[lang];
      if (typeof v === 'string' && v.trim().length > 0) {
        map[lang] = v.trim();
        hasAny = true;
      }
    }
  }
  return hasAny ? map : undefined;
}

function readOptionalEquipmentProfileIds(
  record: Record<string, unknown>
): EquipmentProfileId[] | undefined {
  if (!('equipmentProfileIds' in record)) return undefined;
  const value = record.equipmentProfileIds;
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const validIds = new Set(EQUIPMENT_PROFILES.map((p) => p.id));
  const ids = value.map((v) => {
    if (typeof v !== 'string' || !validIds.has(v as EquipmentProfileId)) {
      throw new Error('Manifeste communautaire invalide.');
    }
    return v as EquipmentProfileId;
  });
  return ids.length > 0 ? ids : undefined;
}

/** Résout le nom d'une entrée selon la langue, avec repli sur le français. */
export function resolveEntryName(entry: { name: string; nameI18n?: I18nMap }, lang: LanguageId): string {
  if (lang === 'fr') return entry.name;
  return entry.nameI18n?.[lang as Exclude<LanguageId, 'fr'>] ?? entry.name;
}

/** Résout la description selon la langue, avec repli sur le français. */
export function resolveEntryDescription(entry: { description: string; descriptionI18n?: I18nMap }, lang: LanguageId): string {
  if (lang === 'fr') return entry.description;
  return entry.descriptionI18n?.[lang as Exclude<LanguageId, 'fr'>] ?? entry.description;
}

/** Résout le goal selon la langue, avec repli sur le français. */
export function resolveEntryGoal(entry: { goal?: string; goalI18n?: I18nMap }, lang: LanguageId): string | undefined {
  if (!entry.goal) return undefined;
  if (lang === 'fr') return entry.goal;
  return entry.goalI18n?.[lang as Exclude<LanguageId, 'fr'>] ?? entry.goal;
}

/** Résout le niveau avec la traduction. */
export function resolveEntryLevel(level: CommunityProgramLevel, lang: LanguageId): string {
  return translate(lang, `level.${level}`);
}

/** Résout les libellés des profils d'équipement. */
export function resolveEquipmentLabels(
  profileIds: EquipmentProfileId[] | undefined,
  lang: LanguageId
): string[] {
  if (!profileIds || profileIds.length === 0) return [];
  const profiles = profileIds
    .map((id) => EQUIPMENT_PROFILES.find((p) => p.id === id))
    .filter((p): p is EquipmentProfile => !!p);
  return profiles.map((p) => translate(lang, p.i18nKey));
}


function readOptionalStrings(
  record: Record<string, unknown>,
  key: string,
  maximum: number
): string[] | undefined {
  if (!(key in record)) return undefined;
  const value = record[key];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > maximum ||
    value.some((item) => typeof item !== 'string' || item.trim().length === 0)
  ) {
    return undefined;
  }

  const strings = value.map((item) => (item as string).trim());
  if (new Set(strings).size !== strings.length) {
    return undefined;
  }
  return strings;
}

function readDaysCount(record: Record<string, unknown>): number {
  const value = record.daysCount;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return 1;
  }

  return value;
}

function readLevel(record: Record<string, unknown>): CommunityProgramLevel {
  const value = record.level;
  if (typeof value !== 'string') {
    return 'beginner';
  }
  return normalizeLevel(value);
}

function readProgramFile(record: Record<string, unknown>): string {
  const file = readString(record, 'file');
  if (!SAFE_COMMUNITY_FILE_PATTERN.test(file) || !file.toLowerCase().endsWith('.json')) {
    throw new Error('Manifeste communautaire invalide.');
  }

  return file;
}

function readPositiveCount(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return 0;
  }

  return value;
}

function readFoodFormat(record: Record<string, unknown>, file: string): CommunityFoodFormat {
  const value = record.format;
  if (value !== 'json' && value !== 'csv') {
    return file.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
  }

  if (!file.toLowerCase().endsWith(`.${value}`)) {
    return file.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
  }

  return value;
}

function parseManifest(text: string): CommunityManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Le manifeste communautaire n\'est pas un JSON valide.');
  }

  if (
    !isRecord(parsed) ||
    (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) ||
    !Array.isArray(parsed.programs) ||
    parsed.programs.length > MAX_COMMUNITY_PROGRAMS ||
    ('foodDatabases' in parsed && !Array.isArray(parsed.foodDatabases)) ||
    ('exercisePacks' in parsed && !Array.isArray(parsed.exercisePacks))
  ) {
    throw new Error('Manifeste communautaire invalide.');
  }

  const ids = new Set<string>();

  // Parse programs: each entry wrapped in try-catch;
  // seuls les champs vitaux (id, name, file) invalident une entree.
  const programs: CommunityProgramEntry[] = [];
  for (const program of parsed.programs) {
    try {
      if (!isRecord(program)) continue;

      const id = readString(program, 'id');
      if (ids.has(id)) continue;
      ids.add(id);

      const name = readString(program, 'name');
      const file = readProgramFile(program);

      const exercisesCount = readOptionalCount(program, 'exercisesCount', 0);
      const goal = readOptionalString(program, 'goal');
      const equipment = readOptionalString(program, 'equipment');
      const equipmentProfileIds = readOptionalEquipmentProfileIds(program);
      const sessionsPerWeek = readOptionalCount(program, 'sessionsPerWeek', 1);
      const sessionMinutes = readOptionalCount(program, 'sessionMinutes', 1);
      const progression = readOptionalString(program, 'progression');
      const tags = readOptionalTags(program);

      programs.push({
        id,
        name,
        description: readOptionalString(program, 'description') ?? '',
        author: readOptionalString(program, 'author') ?? '',
        level: readLevel(program),
        daysCount: readDaysCount(program),
        ...(exercisesCount !== undefined ? { exercisesCount } : {}),
        file,
        ...(goal !== undefined ? { goal } : {}),
        ...(equipment !== undefined ? { equipment } : {}),
        ...(equipmentProfileIds !== undefined ? { equipmentProfileIds } : {}),
        ...(sessionsPerWeek !== undefined ? { sessionsPerWeek } : {}),
        ...(sessionMinutes !== undefined ? { sessionMinutes } : {}),
        ...(progression !== undefined ? { progression } : {}),
        ...(tags !== undefined ? { tags } : {}),
      });
    } catch {
      // ignore l'entree individuelle, continuer avec les autres
    }
  }

  const rawFoodDatabases = Array.isArray(parsed.foodDatabases) ? parsed.foodDatabases : [];
  const foodDatabases: CommunityFoodDatabaseEntry[] = [];
  for (const database of rawFoodDatabases) {
    try {
      if (!isRecord(database)) continue;

      const id = readString(database, 'id');
      if (ids.has(id)) continue;
      ids.add(id);

      const name = readString(database, 'name');
      const file = readString(database, 'file');
      if (!SAFE_COMMUNITY_FILE_PATTERN.test(file)) continue;

      const retailer = readOptionalString(database, 'retailer');
      const country = readOptionalString(database, 'country');
      const retailers = readOptionalStrings(database, 'retailers', 20);
      const license = readOptionalString(database, 'license');
      const attribution = readOptionalString(database, 'attribution');

      foodDatabases.push({
        id,
        name,
        description: readOptionalString(database, 'description') ?? '',
        author: readOptionalString(database, 'author') ?? '',
        ...(retailer ? { retailer } : {}),
        ...(country ? { country } : {}),
        ...(retailers ? { retailers } : {}),
        foodsCount: readPositiveCount(database, 'foodsCount'),
        format: readFoodFormat(database, file),
        file,
        disclaimer: readOptionalString(database, 'disclaimer') ?? '',
        ...(license ? { license } : {}),
        ...(attribution ? { attribution } : {}),
      });
    } catch {
      // ignore l'entree individuelle
    }
  }

  const rawExercisePacks = Array.isArray(parsed.exercisePacks) ? parsed.exercisePacks : [];
  const exercisePacks: CommunityExercisePackEntry[] = [];
  for (const pack of rawExercisePacks) {
    try {
      if (!isRecord(pack)) continue;
      const id = readString(pack, 'id');
      if (ids.has(id)) continue;
      ids.add(id);

      const name = readString(pack, 'name');
      const file = readString(pack, 'file');
      if (!SAFE_COMMUNITY_FILE_PATTERN.test(file) || !file.endsWith('.json')) continue;

      const mediaBaseUrl = readOptionalString(pack, 'mediaBaseUrl');
      if (!mediaBaseUrl || !mediaBaseUrl.startsWith('https://raw.githubusercontent.com/soulgp22/sport-tracker/')) continue;

      exercisePacks.push({
        id,
        name,
        description: readOptionalString(pack, 'description') ?? '',
        author: readOptionalString(pack, 'author') ?? '',
        level: readOptionalString(pack, 'level') ?? 'beginner',
        exercisesCount: readPositiveCount(pack, 'exercisesCount'),
        file,
        mediaBaseUrl,
      });
    } catch {
      // ignore l'entree individuelle
    }
  }

  return {
    version: parsed.version,
    programs,
    foodDatabases,
    ...(Array.isArray(parsed.exercisePacks) ? { exercisePacks } : {}),
  };
}
async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Requête refusée (${response.status}).`);
  }

  const contentLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMPORT_FILE_BYTES) {
    throw new Error('Réponse communautaire trop volumineuse.');
  }

  const text = await response.text();
  assertImportTextSize(text);
  return text;
}

async function readCachedManifest(): Promise<CommunityManifest | null> {
  try {
    const cached = await AsyncStorage.getItem(COMMUNITY_MANIFEST_CACHE_KEY);
    return cached ? parseManifest(cached) : null;
  } catch {
    return null;
  }
}

async function cacheManifest(manifest: CommunityManifest): Promise<void> {
  try {
    await AsyncStorage.setItem(COMMUNITY_MANIFEST_CACHE_KEY, JSON.stringify(manifest));
  } catch {
    // Le cache ne doit pas bloquer l'affichage de la liste distante.
  }
}

export const useCommunityStore = create<CommunityState>((set) => ({
  data: null,
  loading: false,
  error: null,
  offline: false,

  fetchManifest: async () => {
    set({ loading: true, error: null, offline: false });

    try {
      const text = await fetchText(COMMUNITY_MANIFEST_URL);
      const manifest = parseManifest(text);
      await cacheManifest(manifest);
      set({ data: manifest, loading: false, error: null, offline: false });
      return manifest;
    } catch {
      const cached = await readCachedManifest();
      if (cached) {
        set({
          data: cached,
          loading: false,
          error: OFFLINE_CACHE_MESSAGE,
          offline: true,
        });
        return cached;
      }

      set({
        data: null,
        loading: false,
        error: LOAD_ERROR_MESSAGE,
        offline: false,
      });
      return null;
    }
  },

  downloadProgram: async (entry) => {
    try {
      const text = await fetchText(`${COMMUNITY_BASE_URL}${entry.file}`);
      return useProgramStore.getState().importPrograms(text);
    } catch {
      throw new Error(DOWNLOAD_ERROR_MESSAGE);
    }
  },

  downloadFoodDatabase: async (entry) => {
    try {
      const text = await fetchText(`${COMMUNITY_BASE_URL}${entry.file}`);
      const foodStore = useFoodStore.getState();
      return entry.format === 'csv'
        ? foodStore.importFoodsFromCsv(text)
        : foodStore.importFoods(text);
    } catch {
      throw new Error('Impossible de télécharger cette base d’aliments.');
    }
  },

  downloadExercisePack: async (entry) => {
    try {
      const text = await fetchText(`${COMMUNITY_BASE_URL}${entry.file}`);
      const parsed = JSON.parse(text) as { version?: number; exercises?: CatalogExercise[] };
      if (parsed.version !== 1 || !Array.isArray(parsed.exercises)) {
        throw new Error('Pack invalide.');
      }
      const exercises = parsed.exercises.slice(0, 2_000).map((exercise) => ({
        ...exercise,
        remoteMediaBaseUrl: entry.mediaBaseUrl,
      }));
      return useExerciseCatalogStore.getState().installPack(entry.id, exercises);
    } catch {
      throw new Error('Impossible de télécharger ce pack d’exercices.');
    }
  },
}));
