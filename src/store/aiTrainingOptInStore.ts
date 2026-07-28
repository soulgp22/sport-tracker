import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { asyncStorageAdapter } from '../storage/storageAdapter';

/**
 * Opt-in « roue à données » de la photo de repas.
 *
 * Privacy-first : DÉSACTIVÉ par défaut. Quand il est actif, chaque correction
 * de l'utilisateur sur une estimation photo est consignée en texte brut
 * (jamais de photo ni d'image) pour un futur fine-tune du modèle.
 */
interface AiTrainingOptInState {
  aiTrainingOptIn: boolean;
  setAiTrainingOptIn: (value: boolean) => void;
}

export const useAiTrainingOptInStore = create<AiTrainingOptInState>()(
  persist(
    (set) => ({
      aiTrainingOptIn: false,

      setAiTrainingOptIn: (value) => {
        set({ aiTrainingOptIn: value });
      },
    }),
    {
      name: 'ai-training-opt-in-store',
      storage: createJSONStorage(() => asyncStorageAdapter),
    }
  )
);
