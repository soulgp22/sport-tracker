import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { Session } from '../types';

interface SessionState {
  sessions: Session[];

  addSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  getSessionsForExercise: (exerciseId: string) => Session[];
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (session) => {
        set((s) => ({ sessions: [session, ...s.sessions] }));
      },

      deleteSession: (id) => {
        set((s) => ({ sessions: s.sessions.filter((s2) => s2.id !== id) }));
      },

      getSessionsForExercise: (exerciseId) => {
        return get().sessions.filter((s) =>
          s.exercises.some((e) => e.exerciseId === exerciseId)
        );
      },
    }),
    {
      name: 'sessions-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
    }
  )
);
