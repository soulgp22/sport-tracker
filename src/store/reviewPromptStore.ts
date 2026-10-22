import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';

/**
 * Memoire de la demande d'avis Google Play. Sert seulement a respecter le
 * delai entre deux demandes (regle dans `lib/reviewPrompt.ts`).
 */
interface ReviewPromptStoreState {
  /** Date ISO de la derniere demande, null si jamais demande. */
  lastRequestedAt: string | null;
  requestCount: number;
  markRequested: (at: Date) => void;
}

const EMPTY = { lastRequestedAt: null, requestCount: 0 };

export const useReviewPromptStore = create<ReviewPromptStoreState>()(
  persist(
    (set) => ({
      ...EMPTY,
      markRequested: (at) =>
        set((state) => ({
          lastRequestedAt: at.toISOString(),
          requestCount: state.requestCount + 1,
        })),
    }),
    {
      name: 'review-prompt-store-v1',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: (state) => ({
        lastRequestedAt: state.lastRequestedAt,
        requestCount: state.requestCount,
      }),
      // Ne doit jamais lever (voir reusable_functions.md, « merge defensive »).
      merge: (persisted, current) => {
        try {
          if (!persisted || typeof persisted !== 'object') return { ...current, ...EMPTY };
          const saved = persisted as Record<string, unknown>;
          return {
            ...current,
            lastRequestedAt:
              typeof saved.lastRequestedAt === 'string' ? saved.lastRequestedAt : null,
            requestCount:
              typeof saved.requestCount === 'number' && Number.isFinite(saved.requestCount)
                ? saved.requestCount
                : 0,
          };
        } catch {
          return { ...current, ...EMPTY };
        }
      },
    }
  )
);
