import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import performanceRules from '../config/performance-rules.json';
import { asyncStorageAdapter } from '../storage/storageAdapter';
import type {
  ExperienceLevel,
  PerformanceProfile,
  PerformanceSex,
  UnlockedBadge,
} from '../types/performance';

const MAX_DESCRIPTION_LENGTH = 4000;

interface PerformanceState extends PerformanceProfile {
  unlockedBadges: UnlockedBadge[];
  setSex: (sex: PerformanceSex) => void;
  setAge: (age?: number) => void;
  setExperience: (experience: ExperienceLevel) => void;
  setWeeklySessionGoal: (goal: number) => void;
  setMonthlySessionGoal: (goal: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setProgramDescription: (description: string) => void;
  unlockBadges: (ids: string[], unlockedAt?: string) => string[];
}

function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export const usePerformanceStore = create<PerformanceState>()(
  persist(
    (set, get) => ({
      sex: 'unspecified',
      age: undefined,
      experience: 'beginner',
      weeklySessionGoal: performanceRules.goals.defaultWeeklySessions,
      monthlySessionGoal: performanceRules.goals.defaultMonthlySessions,
      notificationsEnabled: false,
      programDescription: '',
      unlockedBadges: [],

      setSex: (sex) => set({ sex }),
      setAge: (age) => set({
        age: age === undefined ? undefined : clampInteger(age, 13, 100),
      }),
      setExperience: (experience) => set({ experience }),
      setWeeklySessionGoal: (goal) => set({
        weeklySessionGoal: clampInteger(
          goal,
          performanceRules.goals.minimum,
          performanceRules.goals.maximumWeekly
        ),
      }),
      setMonthlySessionGoal: (goal) => set({
        monthlySessionGoal: clampInteger(
          goal,
          performanceRules.goals.minimum,
          performanceRules.goals.maximumMonthly
        ),
      }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setProgramDescription: (programDescription) => set({
        programDescription: programDescription.slice(0, MAX_DESCRIPTION_LENGTH),
      }),
      unlockBadges: (ids, unlockedAt = new Date().toISOString()) => {
        const existing = new Set(get().unlockedBadges.map((badge) => badge.id));
        const uniqueNewIds = [...new Set(ids)].filter((id) => !existing.has(id));
        if (uniqueNewIds.length > 0) {
          set((state) => ({
            unlockedBadges: [
              ...state.unlockedBadges,
              ...uniqueNewIds.map((id) => ({ id, unlockedAt })),
            ],
          }));
        }
        return uniqueNewIds;
      },
    }),
    {
      name: 'performance-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
      version: 1,
    }
  )
);
