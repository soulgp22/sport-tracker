import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  COMMUNITY_BASE_URL,
  COMMUNITY_MANIFEST_CACHE_KEY,
  COMMUNITY_MANIFEST_URL,
} from '../constants/community';
import type { ImportResult } from '../types';
import { useProgramStore } from './programStore';

export type CommunityProgramLevel = 'Débutant' | 'Intermédiaire' | 'Avancé';

export interface CommunityProgramEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  level: CommunityProgramLevel;
  daysCount: number;
  file: string;
}

export interface CommunityManifest {
  version: 1;
  programs: CommunityProgramEntry[];
}

interface CommunityState {
  data: CommunityManifest | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  fetchManifest: () => Promise<CommunityManifest | null>;
  downloadProgram: (entry: CommunityProgramEntry) => Promise<ImportResult>;
}

const COMMUNITY_LEVELS: CommunityProgramLevel[] = ['Débutant', 'Intermédiaire', 'Avancé'];
const OFFLINE_CACHE_MESSAGE = 'Hors-ligne, liste en cache.';
const LOAD_ERROR_MESSAGE = 'Impossible de charger les programmes communautaires.';
const DOWNLOAD_ERROR_MESSAGE = 'Impossible de télécharger ce programme.';

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

function parseManifest(text: string): CommunityManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Le manifeste communautaire n\'est pas un JSON valide.');
  }

  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.programs)) {
    throw new Error('Manifeste communautaire invalide.');
  }

  return {
    version: 1,
    programs: parsed.programs.map((program) => {
      if (!isRecord(program)) {
        throw new Error('Manifeste communautaire invalide.');
      }

      return {
        id: readString(program, 'id'),
        name: readString(program, 'name'),
        description: readString(program, 'description'),
        author: readString(program, 'author'),
        level: readLevel(program),
        daysCount: readDaysCount(program),
        file: readString(program, 'file'),
      };
    }),
  };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Requête refusée (${response.status}).`);
  }

  return response.text();
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
}));
