import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import foodsDefaultJson from '../data/foods.default.json';
import { parseFoodsCsv } from '../lib/foodCsv';
import { validateFoodsJson } from '../lib/foodValidation';
import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { Food } from '../types';

export interface ImportFoodsResult {
  added: number;
  errors: string[];
  duplicateIds: string[];
}

interface FoodState {
  customFoods: Food[];
  getAllFoods: () => Food[];
  getDefaultFoods: () => Food[];
  getCustomFoods: () => Food[];
  searchFoods: (query: string) => Food[];
  filterFoodsByCategory: (category: string) => Food[];
  getFoodById: (id: string) => Food | undefined;
  getCategories: () => string[];
  addCustomFood: (food: Food) => void;
  updateCustomFood: (id: string, patch: Partial<Food>) => void;
  deleteCustomFood: (id: string) => void;
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

export const useFoodStore = create<FoodState>()(
  persist(
    (set, get) => ({
      customFoods: [],

      getAllFoods: () => [...defaultFoods, ...get().customFoods],

      getDefaultFoods: () => defaultFoods,

      getCustomFoods: () => get().customFoods,

      searchFoods: (query) => {
        const term = normalize(query);
        const foods = get().getAllFoods();
        if (!term) return foods;

        return foods.filter((food) => normalize(food.name).includes(term));
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

      importFoods: (text) => {
        const existingIds = get()
          .getAllFoods()
          .map((food) => food.id);
        const result = validateFoodsJson(text, existingIds);

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
        const existingIds = get()
          .getAllFoods()
          .map((food) => food.id);
        const result = validateFoodsJson(JSON.stringify({ foods }), existingIds);

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
