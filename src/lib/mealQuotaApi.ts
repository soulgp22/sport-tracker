/**
 * Contrat client du quota serveur (service lst-quota, voir api.md).
 *
 * Le serveur compte les repas ENREGISTRES par appareil et par jour local, et
 * refuse l'analyse photo (HTTP 402) une fois la limite du palier atteinte.
 *
 * Deux en-tetes accompagnent chaque appel concerne, analyse comprise :
 * - `X-Device-Id` : identifiant d'appareil (lib/deviceIdentity) ;
 * - `X-Utc-Offset` : decalage horaire en minutes, pour que le serveur range
 *   le repas dans le jour LOCAL de l'utilisateur, pas le jour UTC.
 *
 * Module PUR (construction et lecture des requetes) : le `fetch` est fait par
 * l'appelant, comme pour lib/mealPhotoApi.
 */
import { MEAL_SERVER_API_KEY, MEAL_SERVER_URL, type MealServerRequest } from './mealPhotoApi';
import type { QuotaTier, ServerQuotaStatus } from './mealPhotoQuota';

export const QUOTA_EXCEEDED_STATUS = 402;
const QUOTA_PATH = '/v1/quota';

export interface QuotaIdentity {
  deviceId: string;
  /** Minutes a ajouter a l'UTC pour obtenir l'heure locale (Paris ete : 120). */
  utcOffsetMinutes: number;
}

export function currentUtcOffsetMinutes(now: Date = new Date()): number {
  // getTimezoneOffset renvoie UTC - local : son signe est l'inverse du notre.
  return -now.getTimezoneOffset();
}

export function quotaHeaders(identity: QuotaIdentity | null): Record<string, string> {
  if (!identity) return {};
  return {
    'X-Device-Id': identity.deviceId,
    'X-Utc-Offset': String(Math.round(identity.utcOffsetMinutes)),
  };
}

function baseHeaders(identity: QuotaIdentity): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${MEAL_SERVER_API_KEY}`,
    ...quotaHeaders(identity),
  };
}

/**
 * `refresh` force le serveur a reinterroger le fournisseur de paiement au lieu
 * de son cache : a utiliser juste apres un achat ou une restauration.
 */
export function buildQuotaStatusRequest(
  identity: QuotaIdentity,
  { refresh = false }: { refresh?: boolean } = {}
): { url: string; headers: Record<string, string> } {
  return {
    url: `${MEAL_SERVER_URL}${QUOTA_PATH}${refresh ? '?refresh=1' : ''}`,
    headers: baseHeaders(identity),
  };
}

/** Declare un repas enregistre. Idempotent cote serveur pour un meme `analysisId`. */
export function buildConsumeRequest(identity: QuotaIdentity, analysisId: string): MealServerRequest {
  return {
    url: `${MEAL_SERVER_URL}${QUOTA_PATH}/consume`,
    headers: baseHeaders(identity),
    body: JSON.stringify({ analysisId }),
  };
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readTier(value: unknown): QuotaTier | null {
  return value === 'free' || value === 'premium' ? value : null;
}

/** Lit la reponse de `GET /v1/quota` (ou d'un refus 402). Null si inattendue. */
export function parseQuotaStatus(json: unknown): ServerQuotaStatus | null {
  if (!json || typeof json !== 'object') return null;
  const source = (json as { quota?: unknown }).quota ?? json;
  if (!source || typeof source !== 'object') return null;
  const { day, tier, limit, used } = source as Record<string, unknown>;
  const parsedTier = readTier(tier);
  if (typeof day !== 'string' || !DAY_PATTERN.test(day) || !parsedTier) return null;
  if (typeof limit !== 'number' || typeof used !== 'number') return null;
  if (!Number.isFinite(limit) || !Number.isFinite(used)) return null;
  return { day, tier: parsedTier, limit, used };
}

/**
 * Identifiant d'analyse : cle d'idempotence de `consume`, pas un secret. Un
 * repas declare deux fois (reprise apres une coupure reseau) ne compte qu'une
 * fois.
 */
export function createAnalysisId(now: number = Date.now(), random: () => number = Math.random): string {
  const entropy = Array.from({ length: 3 }, () =>
    Math.floor(random() * 0x100000000).toString(36).padStart(7, '0')
  ).join('');
  return `a-${now.toString(36)}-${entropy}`;
}
