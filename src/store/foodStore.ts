import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import foodsDefaultJson from '../data/foods.default.json';
import { searchFoods as searchFoodsApi } from '../lib/catalogApi';
import type { CatalogSearchResult } from '../lib/catalogApi';
import { parseFoodsCsv } from '../lib/foodCsv';
import { validateFoodsJson } from '../lib/foodValidation';
import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { Food } from '../types';

export interface ImportFoodsResult {
  added: number;
  errors: string[];
  duplicateIds: string[];
}

export type FoodSearchError = 'none' | 'unavailable' | 'server-not-configured';

interface FoodState {
  customFoods: Food[];
  /** Résultats de la dernière recherche réseau (aliments serveur uniquement). */
  networkFoodResults: Food[];
  /** Chargement en cours d'une recherche réseau. */
  searchLoading: boolean;
  /** Erreur de la dernière recherche réseau. */
  searchError: FoodSearchError;
  getAllFoods: () => Food[];
  getDefaultFoods: () => Food[];
  getCustomFoods: () => Food[];
  /** Retourne les aliments serveur fusionnés avec les aliments personnels locaux. */
  searchFoods: (query: string) => Food[];
  /** Recherche via la passerelle serveur. Met à jour networkFoodResults / searchLoading / searchError. */
  searchFoodsAsync: (query: string) => Promise<void>;
  filterFoodsByCategory: (category: string) => Food[];
  getFoodById: (id: string) => Food | undefined;
  getCategories: () => string[];
  addCustomFood: (food: Food) => void;
  updateCustomFood: (id: string, patch: Partial<Food>) => void;
  deleteCustomFood: (id: string) => void;
  deleteCustomFoods: (ids: string[]) => number;
  importFoods: (text: string) => ImportFoodsResult;
  importFoodsFromCsv: (text: string) => ImportFoodsResult;
}

const defaultFoods = foodsDefaultJson as Food[];

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function asCustomFood(food: Food): Food {
  return { ...food, isCustom: true };
}

function sortCategories(categories: string[]) {
  return [...categories].sort((a, b) => a.localeCompare(b, 'fr'));
}

function resultToSearchError(r: CatalogSearchResult<Food>): FoodSearchError {
  if (r.kind === 'unavailable') return 'unavailable';
  if (r.kind === 'server-not-configured') return 'server-not-configured';
  return 'none';
}

export const useFoodStore = create<FoodState>()(
  persist(
    (set, get) => ({
      customFoods: [],
      networkFoodResults: [],
      searchLoading: false,
      searchError: 'none' as FoodSearchError,

      getAllFoods: () => [...defaultFoods, ...get().customFoods],

      getDefaultFoods: () => defaultFoods,

      getCustomFoods: () => get().customFoods,

      /** Fusionne les résultats réseau avec les aliments personnels (isCustom) et les aliments par défaut. */
      searchFoods: (query) => {
        const term = normalize(query);
        const customFoods = get().customFoods;
        const networkResults = get().networkFoodResults;

        // Fusion des sources : serveur + aliments personnels (isCustom) + aliments par défaut
        const merged = new Map<string, Food>();

        // 1. Aliments serveur
        for (const food of networkResults) {
          merged.set(food.id, food);
        }

        // 2. Aliments personnels (isCustom: true) — écrasent le serveur si même id
        for (const food of customFoods) {
          merged.set(food.id, food);
        }

        // 3. Aliments par défaut (pour les recherches vides ou quand le serveur est indisponible)
        for (const food of defaultFoods) {
          if (!merged.has(food.id)) {
            merged.set(food.id, food);
          }
        }

        const allFoods = [...merged.values()];

        if (!term) return allFoods;
        return allFoods.filter((food) => normalize(food.name).includes(term));
      },

      searchFoodsAsync: async (query) => {
        set({ searchLoading: true, searchError: 'none' });
        try {
          const result = await searchFoodsApi(query, 200, 0);
          set({
            searchLoading: false,
            searchError: resultToSearchError(result),
            networkFoodResults: result.kind === 'found' ? result.items : [],
          });
        } catch {
          set({ searchLoading: false, searchError: 'unavailable', networkFoodResults: [] });
        }
      },

      filterFoodsByCategory: (category) => {
        if (!category) return get().getAllFoods();
        return get().getAllFoods().filter((food) => food.category === category);
      },

      getFoodById: (id) => get().getAllFoods().find((food) => food.id === id),

      getCategories: () => sortCategories([...new Set(get().getAllFoods().map((food) => food.category))]),

      addCustomFood: (food) => {
        const customFood = asCustomFood(food);
        if (get().getFoodById(customFood.id)) return;

        set((state) => ({ customFoods: [customFood, ...state.customFoods] }));
      },

      updateCustomFood: (id, patch) => {
        set((state) => ({
          customFoods: state.customFoods.map((food) =>
            food.id === id ? { ...food, ...patch, id: food.id, isCustom: true } : food
          ),
        }));
      },

      deleteCustomFood: (id) => {
        set((state) => ({ customFoods: state.customFoods.filter((food) => food.id !== id) }));
      },

      deleteCustomFoods: (ids) => {
        const selectedIds = new Set(ids);
        if (selectedIds.size === 0) return 0;

        const previousCount = get().customFoods.length;
        set((state) => ({
          customFoods: state.customFoods.filter((food) => !selectedIds.has(food.id)),
        }));
        return previousCount - get().customFoods.length;
      },

      importFoods: (text) => {
        const allFoods = get().getAllFoods();
        const existingIds = allFoods.map((food) => food.id);
        const existingBarcodes = allFoods
          .filter((food) => food.barcode && food.barcode.trim().length > 0)
          .map((food) => food.barcode!.trim());
        const result = validateFoodsJson(text, existingIds, existingBarcodes);

        if (result.foods.length > 0) {
          set((state) => ({ customFoods: [...result.foods, ...state.customFoods] }));
        }

        return {
          added: result.foods.length,
          errors: result.errors,
          duplicateIds: result.duplicateIds,
        };
      },

      importFoodsFromCsv: (text) => {
        const { foods, errors: csvErrors } = parseFoodsCsv(text);
        const allFoods = get().getAllFoods();
        const existingIds = allFoods.map((food) => food.id);
        const existingBarcodes = allFoods
          .filter((food) => food.barcode && food.barcode.trim().length > 0)
          .map((food) => food.barcode!.trim());
        const result = validateFoodsJson(JSON.stringify({ foods }), existingIds, existingBarcodes);

        if (result.foods.length > 0) {
          set((state) => ({ customFoods: [...result.foods, ...state.customFoods] }));
        }

        return {
          added: result.foods.length,
          errors: [...csvErrors, ...result.errors],
          duplicateIds: result.duplicateIds,
        };
      },
    }),
    {
      name: 'food-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({ customFoods: state.customFoods }),
    }
  )
);

export function normalizeFoodName(name: string) {
  return normalize(name);
}
