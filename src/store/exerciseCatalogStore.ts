import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  getExerciseDisplayName,
} from '../constants/exerciseI18n';
import { searchExercises } from '../lib/catalogApi';
import type { CatalogSearchResult } from '../lib/catalogApi';
import coreCatalogJson from '../data/exercises.catalog.json';
import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { CatalogExercise } from '../types';

// Catalogue complet (873 exercices) embarqué par défaut depuis la 1.16.0 : les
// programmes communautaires référencent des exercices absents du petit
// catalogue « core » (22 entrées), ce qui vidait silencieusement la plupart
// des jours importés. Voir known_bugs.md.
const coreCatalog = coreCatalogJson as CatalogExercise[];

function normalize(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

let byId = new Map<string, CatalogExercise>();
let byName = new Map<string, CatalogExercise>();

function rebuildIndexes(exercises: CatalogExercise[]) {
  byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  byName = new Map();
  for (const exercise of exercises) {
    byName.set(normalize(exercise.name), exercise);
    if (exercise.nameFr) byName.set(normalize(exercise.nameFr), exercise);
  }
}

// Index des ids embarques, reutilise par mergeCatalog ET par la purge a la
// rehydratation : les deux doivent appliquer exactement le meme critere.
const coreById = new Map(coreCatalog.map((exercise) => [exercise.id, exercise]));

function mergeCatalog(downloaded: CatalogExercise[]) {
  const merged = new Map(coreCatalog.map((exercise) => [exercise.id, exercise]));
  // Le catalogue EMBARQUÉ fait autorité : un pack téléchargé ne peut qu'AJOUTER
  // des exercices absents, jamais écraser une entrée livrée avec l'app.
  //
  // Avant, le pack gagnait — et comme il est persisté dans AsyncStorage, un
  // utilisateur ayant téléchargé « Plus d'exercices » gardait ses anciennes
  // données à VIE : la correction des 873 noms français de la 1.18.0 était
  // réécrite par le pack périmé à chaque démarrage, et mettre à jour l'app n'y
  // changeait rien. Voir known_bugs.md.
  downloaded.forEach((exercise) => {
    if (!merged.has(exercise.id)) merged.set(exercise.id, exercise);
  });
  return [...merged.values()];
}

rebuildIndexes(coreCatalog);

export type SearchError = 'none' | 'unavailable' | 'server-not-configured';

interface ExerciseCatalogState {
  exercises: CatalogExercise[];
  downloadedExercises: CatalogExercise[];
  installedPackIds: string[];
  bodyParts: string[];
  equipments: string[];
  /** Résultats de la dernière recherche réseau. */
  searchResults: CatalogExercise[];
  /** Chargement en cours d'une recherche réseau. */
  searchLoading: boolean;
  /** Erreur de la dernière recherche réseau. */
  searchError: SearchError;
  all: () => CatalogExercise[];
  getById: (id: string) => CatalogExercise | undefined;
  findByName: (name: string) => CatalogExercise | undefined;
  /** Recherche via la passerelle serveur. Met à jour searchResults / searchLoading / searchError. */
  searchAsync: (query: string) => Promise<void>;
  /** Filtrage local par groupe musculaire sur le catalogue complet. */
  filterByMuscle: (bodyPart: string) => CatalogExercise[];
  installPack: (packId: string, exercises: CatalogExercise[]) => number;
}

function dimensions(exercises: CatalogExercise[]) {
  return {
    bodyParts: [...new Set(exercises.map((exercise) => exercise.bodyPart))].sort(),
    equipments: [...new Set(exercises.map((exercise) => exercise.equipment))].sort(),
  };
}

function resultToSearchError(r: CatalogSearchResult<CatalogExercise>): SearchError {
  if (r.kind === 'unavailable') return 'unavailable';
  if (r.kind === 'server-not-configured') return 'server-not-configured';
  return 'none';
}

export const useExerciseCatalogStore = create<ExerciseCatalogState>()(
  persist(
    (set, get) => ({
      exercises: coreCatalog,
      downloadedExercises: [],
      installedPackIds: [],
      ...dimensions(coreCatalog),
      searchResults: [],
      searchLoading: false,
      searchError: 'none' as SearchError,
      all: () => get().exercises,
      getById: (id) => byId.get(id),
      findByName: (name) => byName.get(normalize(name)),
      searchAsync: async (query) => {
        set({ searchLoading: true, searchError: 'none' });
        try {
          const result = await searchExercises(query, 200, 0);
          set({
            searchLoading: false,
            searchError: resultToSearchError(result),
            searchResults: result.kind === 'found' ? result.items : [],
          });
        } catch {
          set({ searchLoading: false, searchError: 'unavailable', searchResults: [] });
        }
      },
      filterByMuscle: (bodyPart) => bodyPart
        ? get().exercises.filter((exercise) => exercise.bodyPart === bodyPart)
        : get().exercises,
      installPack: (packId, incoming) => {
        const valid = incoming.filter((exercise) =>
          typeof exercise.id === 'string' && typeof exercise.name === 'string' &&
          Array.isArray(exercise.instructions) && Array.isArray(exercise.secondaryMuscles)
        );
        const current = new Map(get().downloadedExercises.map((exercise) => [exercise.id, exercise]));
        // Même invariant qu'à la réhydratation : on ne stocke JAMAIS un exercice
        // déjà livré avec l'app. Sans ce filtre, re-télécharger le pack
        // ré-empilerait 851 entrées redondantes (~1,6 Mo) qui seraient de toute
        // façon ignorées par mergeCatalog.
        valid.forEach((exercise) => {
          if (!coreById.has(exercise.id)) current.set(exercise.id, exercise);
        });
        const downloadedExercises = [...current.values()];
        const exercises = mergeCatalog(downloadedExercises);
        rebuildIndexes(exercises);
        set({
          downloadedExercises,
          exercises,
          installedPackIds: [...new Set([...get().installedPackIds, packId])],
          ...dimensions(exercises),
        });
        return valid.length;
      },
    }),
    {
      name: 'exercise-catalog-store-v2',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        downloadedExercises: state.downloadedExercises,
        installedPackIds: state.installedPackIds,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<ExerciseCatalogState>;
        // PURGE au démarrage : un exercice téléchargé dont l'id existe déjà dans
        // le catalogue embarqué est supprimé du stockage, pas seulement ignoré.
        //
        // Depuis la 1.16.0 les 873 exercices sont livrés avec l'app : le pack
        // « Plus d'exercices » (851 entrées) est devenu entièrement redondant.
        // Le garder ne servait qu'à conserver ~1,6 Mo de données périmées — et à
        // laisser un piège prêt à ressortir si la règle de priorité changeait.
        // Voir known_bugs.md.
        const savedDownloaded = saved.downloadedExercises ?? [];
        const downloadedExercises = savedDownloaded.filter(
          (exercise) => !coreById.has(exercise.id)
        );
        const purged = savedDownloaded.length - downloadedExercises.length;
        const exercises = mergeCatalog(downloadedExercises);
        rebuildIndexes(exercises);
        return {
          ...current,
          downloadedExercises,
          // Si la purge n'a rien laissé, plus aucun pack n'apporte quoi que ce
          // soit : l'indiquer « installé » mentirait à l'utilisateur.
          installedPackIds:
            downloadedExercises.length === 0 && purged > 0
              ? []
              : saved.installedPackIds ?? [],
          exercises,
          ...dimensions(exercises),
        };
      },
    }
  )
);

export function getCatalogExercise(id: string) { return byId.get(id); }
export function findCatalogExerciseByName(name: string) { return byName.get(normalize(name)); }
export function getCatalogExerciseName(id: string, fallback = 'Exercice') {
  const exercise = byId.get(id);
  return exercise ? getExerciseDisplayName(exercise) : fallback;
}
