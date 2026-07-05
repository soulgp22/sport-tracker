import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from '../storage/storageAdapter';
import type { Session } from '../types';

interface SessionState {
  sessions: Session[];

  addSession: (session: Session) => void;
  upsertSession: (session: Session) => void;
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

      upsertSession: (session) => {
        set((s) => {
          const index = s.sessions.findIndex((existing) => existing.id === session.id);

          if (index === -1) {
            return { sessions: [session, ...s.sessions] };
          }

          const sessions = [...s.sessions];
          sessions[index] = session;
          return { sessions };
        });
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
