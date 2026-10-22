/**
 * Appels reseau du quota serveur. La construction et la lecture des requetes
 * sont dans lib/mealQuotaApi (pur, teste) ; ici, seulement le transport.
 *
 * Aucune erreur ne remonte : un quota injoignable ne doit jamais bloquer
 * l'utilisateur plus que la regle locale. Le serveur, lui, tranche au moment
 * de l'analyse (HTTP 402).
 */
import { getDeviceId } from './deviceIdentity';
import {
  buildConsumeRequest,
  buildQuotaStatusRequest,
  currentUtcOffsetMinutes,
  parseQuotaStatus,
  type QuotaIdentity,
} from './mealQuotaApi';
import { MEAL_SERVER_API_KEY, MEAL_SERVER_URL } from './mealPhotoApi';
import type { ServerQuotaStatus } from './mealPhotoQuota';

const QUOTA_TIMEOUT_MS = 6000;

export function currentQuotaIdentity(): QuotaIdentity | null {
  const deviceId = getDeviceId();
  if (!deviceId || !MEAL_SERVER_URL || !MEAL_SERVER_API_KEY) return null;
  return { deviceId, utcOffsetMinutes: currentUtcOffsetMinutes() };
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUOTA_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchServerQuota(
  options: { refresh?: boolean } = {}
): Promise<ServerQuotaStatus | null> {
  const identity = currentQuotaIdentity();
  if (!identity) return null;
  try {
    const request = buildQuotaStatusRequest(identity, options);
    const response = await withTimeout((signal) =>
      fetch(request.url, { headers: request.headers, signal })
    );
    if (!response.ok) return null;
    return parseQuotaStatus(await response.json());
  } catch {
    return null;
  }
}

/** Renvoie l'etat a jour, ou null si la declaration n'a pas abouti (a retenter). */
export async function postConsume(analysisId: string): Promise<ServerQuotaStatus | null> {
  const identity = currentQuotaIdentity();
  if (!identity) return null;
  try {
    const request = buildConsumeRequest(identity, analysisId);
    const response = await withTimeout((signal) =>
      fetch(request.url, { method: 'POST', headers: request.headers, body: request.body, signal })
    );
    if (!response.ok) return null;
    return parseQuotaStatus(await response.json());
  } catch {
    return null;
  }
}
