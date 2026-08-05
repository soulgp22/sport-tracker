/**
 * « Roue à données » de la feature photo de repas.
 *
 * Chaque correction de l'utilisateur sur une estimation du VLM devient une
 * donnée d'entraînement pour un futur fine-tune : on conserve le diff entre
 * la sortie brute du modèle et l'état final validé.
 *
 * Règles privacy strictes :
 * - rien n'est conservé ni envoyé sans l'opt-in explicite
 *   (useAiTrainingOptInStore, désactivé par défaut) ;
 * - avec opt-in : le diff textuel est conservé localement (500 records max,
 *   FIFO) ET, si la photo est fournie, le couple photo + corrections est
 *   envoyé au serveur d'entraînement (cf. repas du projet) ;
 * - best-effort silencieux : le logging ne doit JAMAIS impacter l'UI.
 *
 * Dépendances : AsyncStorage (mockée sous Jest) + normalisation de
 * mealPhotoAi. fetch n'est appelé que si une photo est fournie (jamais
 * sous Jest : les tests n'en passent pas).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeFoodName } from './mealPhotoAi';
import { buildTrainingUploadRequest } from './mealPhotoApi';
import { useAiTrainingOptInStore } from '../store/aiTrainingOptInStore';

const STORAGE_KEY = 'meal-photo-training-log-v1';
export const MAX_TRAINING_RECORDS = 500;

/** Sortie brute du pipeline : item reconnu + match automatique éventuel. */
export interface ModelItem {
  name: string;
  grams: number;
  /** Aliment de la base auto-matché au moment de l'analyse (null si aucun). */
  matchedFoodName?: string | null;
}

/** État final d'un item après corrections utilisateur. */
export interface FinalItem {
  /** Nom reconnu par le modèle (null pour un ajout manuel). */
  recognizedName: string | null;
  /** Aliment de la base finalement retenu (null si non matché). */
  foodName: string | null;
  grams: number;
}

export type CorrectedItem =
  | { action: 'kept'; recognizedName: string; gramsBefore: number }
  | { action: 'edited'; recognizedName: string; gramsBefore: number; gramsAfter: number }
  | { action: 'removed'; recognizedName: string; gramsBefore: number }
  | {
      action: 'remapped';
      recognizedName: string;
      foodName: string;
      gramsBefore: number;
      gramsAfter: number;
    }
  | { action: 'added'; foodName: string; grams: number };

export interface MealPhotoTrainingRecord {
  id: string;
  createdAt: string;
  modelItems: ModelItem[];
  corrections: CorrectedItem[];
}

let recordCounter = 0;

/**
 * Calcule le diff entre la sortie du modèle et l'état final validé :
 * - kept    : item conservé tel quel (même mapping, mêmes grammes) ;
 * - edited  : grammes modifiés, mapping inchangé ;
 * - removed : item supprimé par l'utilisateur ;
 * - remapped: aliment retenu différent du match automatique (y compris un
 *             match manuel quand le pipeline n'avait rien trouvé) ;
 * - added   : item ajouté manuellement (absent de la sortie modèle).
 *
 * L'appariement modèle ↔ final se fait sur le nom reconnu normalisé,
 * en consommant chaque item final une seule fois (doublons possibles).
 */
export function buildTrainingRecord(
  modelItems: ModelItem[],
  finalItems: FinalItem[]
): MealPhotoTrainingRecord {
  const remaining = finalItems.map((item) => ({ item, used: false }));
  const corrections: CorrectedItem[] = [];

  for (const modelItem of modelItems) {
    const modelNorm = normalizeFoodName(modelItem.name);
    const match = remaining.find(
      (entry) =>
        !entry.used &&
        entry.item.recognizedName !== null &&
        normalizeFoodName(entry.item.recognizedName) === modelNorm
    );

    if (!match) {
      corrections.push({
        action: 'removed',
        recognizedName: modelItem.name,
        gramsBefore: modelItem.grams,
      });
      continue;
    }
    match.used = true;

    const matchedFoodName = modelItem.matchedFoodName ?? null;
    const remapped = match.item.foodName !== matchedFoodName;
    if (remapped && match.item.foodName !== null) {
      corrections.push({
        action: 'remapped',
        recognizedName: modelItem.name,
        foodName: match.item.foodName,
        gramsBefore: modelItem.grams,
        gramsAfter: match.item.grams,
      });
    } else if (match.item.grams !== modelItem.grams) {
      corrections.push({
        action: 'edited',
        recognizedName: modelItem.name,
        gramsBefore: modelItem.grams,
        gramsAfter: match.item.grams,
      });
    } else {
      corrections.push({
        action: 'kept',
        recognizedName: modelItem.name,
        gramsBefore: modelItem.grams,
      });
    }
  }

  for (const entry of remaining) {
    if (entry.used || entry.item.foodName === null) continue;
    corrections.push({
      action: 'added',
      foodName: entry.item.foodName,
      grams: entry.item.grams,
    });
  }

  recordCounter += 1;
  return {
    id: `rec-${Date.now()}-${recordCounter}`,
    createdAt: new Date().toISOString(),
    modelItems,
    corrections,
  };
}

// File de sérialisation : deux appends concurrents ne doivent jamais se
// marcher dessus (read-modify-write). Chaque append est chaîné au précédent.
let writeQueue: Promise<void> = Promise.resolve();

async function appendInternal(record: MealPhotoTrainingRecord): Promise<void> {
  const records = await getRecords();
  records.push(record);
  const trimmed = records.slice(-MAX_TRAINING_RECORDS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Append atomique et borné (500 records, FIFO). Best-effort silencieux :
 * ne lève JAMAIS d'exception, le logging ne doit pas impacter l'UI.
 */
export function appendTrainingRecord(record: MealPhotoTrainingRecord): Promise<void> {
  writeQueue = writeQueue.then(() => appendInternal(record)).catch(() => {
    // Stockage indisponible ou plein : on abandonne ce record, sans bruit.
  });
  return writeQueue;
}

/** Lit tous les records conservés ([] si stockage vide ou corrompu). */
export async function getRecords(): Promise<MealPhotoTrainingRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MealPhotoTrainingRecord[];
  } catch {
    return [];
  }
}

/** Efface tout le journal (best-effort silencieux). */
export async function clearRecords(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Rien à effacer : tant pis.
  }
}

/** Export JSON autonome : {version: 1, exportedAt, records}. */
export async function exportRecordsJson(): Promise<string> {
  const records = await getRecords();
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), records },
    null,
    2
  );
}

/**
 * Point d'entrée unique pour l'UI : ne fait RIEN si l'opt-in est inactif.
 * Fire-and-forget — ne jamais awaiter dans un handler UI.
 * Si photoJpegBase64 est fournie, le couple photo + corrections est aussi
 * envoyé au serveur d'entraînement (best-effort, silencieux).
 */
export async function logMealPhotoTraining(
  modelItems: ModelItem[],
  finalItems: FinalItem[],
  photoJpegBase64?: string
): Promise<void> {
  try {
    if (!useAiTrainingOptInStore.getState().aiTrainingOptIn) return;
    if (modelItems.length === 0) return;
    const record = buildTrainingRecord(modelItems, finalItems);
    await appendTrainingRecord(record);
    if (photoJpegBase64) void uploadTrainingCorrection(record, photoJpegBase64);
  } catch {
    // Double filet : le logging ne doit jamais faire échouer l'UI.
  }
}

/** Envoie la correction annotée au serveur. Silencieux : un échec réseau
 * n'est pas grave — la donnée reste conservée localement. */
async function uploadTrainingCorrection(
  record: MealPhotoTrainingRecord,
  photoJpegBase64: string
): Promise<void> {
  try {
    const request = buildTrainingUploadRequest(record, photoJpegBase64);
    await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
    });
  } catch {
    // Réseau coupé ou serveur indisponible : tant pis, rien à signaler.
  }
}
