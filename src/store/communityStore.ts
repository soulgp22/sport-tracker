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

export type CommunityProgramLevel = 'Débutant' | 'Intermédiaire' | 'Avancé';

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
  sessionsPerWeek?: number;
  sessionMinutes?: number;
  progression?: string;
  tags?: string[];
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

const COMMUNITY_LEVELS: CommunityProgramLevel[] = ['Débutant', 'Intermédiaire', 'Avancé'];
const OFFLINE_CACHE_MESSAGE = 'Hors-ligne, liste en cache.';
const LOAD_ERROR_MESSAGE = 'Impossible de charger les contenus communautaires.';
const DOWNLOAD_ERROR_MESSAGE = 'Impossible de télécharger ce programme.';
const MAX_COMMUNITY_PROGRAMS = 200;
const MAX_COMMUNITY_FOOD_DATABASES = 100;
const MAX_COMMUNITY_EXERCISE_PACKS = 20;
const SAFE_COMMUNITY_FILE_PATTERN = /^[a-z0-9][a-z0-9._-]*\.(json|csv)$/i;

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
    throw new Error('Manifeste communautaire invalide.');
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
    throw new Error('Manifeste communautaire invalide.');
  }

  return value.map((tag) => (tag as string).trim());
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
    throw new Error('Manifeste communautaire invalide.');
  }

  const strings = value.map((item) => (item as string).trim());
  if (new Set(strings).size !== strings.length) {
    throw new Error('Manifeste communautaire invalide.');
  }
  return strings;
}

function readDaysCount(record: Record<string, unknown>): number {
  const value = record.daysCount;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('Manifeste communautaire invalide.');
  }

  return value;
}

function readLevel(record: Record<string, unknown>): CommunityProgramLevel {
  const value = record.level;
  if (typeof value !== 'string' || !COMMUNITY_LEVELS.includes(value as CommunityProgramLevel)) {
    throw new Error('Manifeste communautaire invalide.');
  }

  return value as CommunityProgramLevel;
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
    throw new Error('Manifeste communautaire invalide.');
  }

  return value;
}

function readFoodFormat(record: Record<string, unknown>, file: string): CommunityFoodFormat {
  const value = record.format;
  if (value !== 'json' && value !== 'csv') {
    throw new Error('Manifeste communautaire invalide.');
  }

  if (!file.toLowerCase().endsWith(`.${value}`)) {
    throw new Error('Manifeste communautaire invalide.');
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
  const programs = parsed.programs.map((program) => {
      if (!isRecord(program)) {
        throw new Error('Manifeste communautaire invalide.');
      }

      const id = readString(program, 'id');
      if (ids.has(id)) {
        throw new Error('Manifeste communautaire invalide.');
      }
      ids.add(id);

      const exercisesCount = readOptionalCount(program, 'exercisesCount', 0);
      const goal = readOptionalString(program, 'goal');
      const equipment = readOptionalString(program, 'equipment');
      const sessionsPerWeek = readOptionalCount(program, 'sessionsPerWeek', 1);
      const sessionMinutes = readOptionalCount(program, 'sessionMinutes', 1);
      const progression = readOptionalString(program, 'progression');
      const tags = readOptionalTags(program);

      return {
        id,
        name: readString(program, 'name'),
        description: readString(program, 'description'),
        author: readString(program, 'author'),
        level: readLevel(program),
        daysCount: readDaysCount(program),
        ...(exercisesCount !== undefined ? { exercisesCount } : {}),
        file: readProgramFile(program),
        ...(goal !== undefined ? { goal } : {}),
        ...(equipment !== undefined ? { equipment } : {}),
        ...(sessionsPerWeek !== undefined ? { sessionsPerWeek } : {}),
        ...(sessionMinutes !== undefined ? { sessionMinutes } : {}),
        ...(progression !== undefined ? { progression } : {}),
        ...(tags !== undefined ? { tags } : {}),
      };
    });

  const rawFoodDatabases = Array.isArray(parsed.foodDatabases) ? parsed.foodDatabases : [];
  if (rawFoodDatabases.length > MAX_COMMUNITY_FOOD_DATABASES) {
    throw new Error('Manifeste communautaire invalide.');
  }

  const foodDatabases = rawFoodDatabases.map((database) => {
    if (!isRecord(database)) {
      throw new Error('Manifeste communautaire invalide.');
    }

    const id = readString(database, 'id');
    if (ids.has(id)) {
      throw new Error('Manifeste communautaire invalide.');
    }
    ids.add(id);

    const file = readString(database, 'file');
    if (!SAFE_COMMUNITY_FILE_PATTERN.test(file)) {
      throw new Error('Manifeste communautaire invalide.');
    }

    const retailer = readOptionalString(database, 'retailer');
    const country = readOptionalString(database, 'country');
    const retailers = readOptionalStrings(database, 'retailers', 20);
    const license = readOptionalString(database, 'license');
    const attribution = readOptionalString(database, 'attribution');

    if (!retailer && !country) {
      throw new Error('Manifeste communautaire invalide.');
    }

    return {
      id,
      name: readString(database, 'name'),
      description: readString(database, 'description'),
      author: readString(database, 'author'),
      ...(retailer ? { retailer } : {}),
      ...(country ? { country } : {}),
      ...(retailers ? { retailers } : {}),
      foodsCount: readPositiveCount(database, 'foodsCount'),
      format: readFoodFormat(database, file),
      file,
      disclaimer: readString(database, 'disclaimer'),
      ...(license ? { license } : {}),
      ...(attribution ? { attribution } : {}),
    };
  });

  const rawExercisePacks = Array.isArray(parsed.exercisePacks) ? parsed.exercisePacks : [];
  if (rawExercisePacks.length > MAX_COMMUNITY_EXERCISE_PACKS) {
    throw new Error('Manifeste communautaire invalide.');
  }
  const exercisePacks = rawExercisePacks.map((pack) => {
    if (!isRecord(pack)) throw new Error('Manifeste communautaire invalide.');
    const id = readString(pack, 'id');
    if (ids.has(id)) throw new Error('Manifeste communautaire invalide.');
    ids.add(id);
    const file = readString(pack, 'file');
    if (!SAFE_COMMUNITY_FILE_PATTERN.test(file) || !file.endsWith('.json')) {
      throw new Error('Manifeste communautaire invalide.');
    }
    const mediaBaseUrl = readString(pack, 'mediaBaseUrl');
    if (!mediaBaseUrl.startsWith('https://raw.githubusercontent.com/soulgp22/sport-tracker/')) {
      throw new Error('Manifeste communautaire invalide.');
    }
    return {
      id,
      name: readString(pack, 'name'),
      description: readString(pack, 'description'),
      author: readString(pack, 'author'),
      level: readString(pack, 'level'),
      exercisesCount: readPositiveCount(pack, 'exercisesCount'),
      file,
      mediaBaseUrl,
    };
  });

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
