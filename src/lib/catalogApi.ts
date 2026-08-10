import type { CatalogExercise, Food } from '../types';
import { MEAL_SERVER_API_KEY, MEAL_SERVER_URL } from './mealPhotoApi';

/**
 * Recherche d'exercices et d'aliments via la passerelle serveur.
 *
 * Décision produit : l'application est payante, le fonctionnement hors ligne
 * n'est plus une exigence. La dépendance réseau est ASSUMÉE.
 *
 * Contrat serveur (déployé, testé en production) :
 *   GET /v1/exercises?q=&limit=&offset=   → { items: [...], total, limit, offset }
 *   GET /v1/foods?q=&limit=&offset=       → { items: [...], total, limit, offset }
 *   En-tête : Authorization: Bearer <cle>
 *
 * Les entrées ont EXACTEMENT la même forme que les fichiers embarqués :
 * mêmes champs, mêmes types — on réutilise CatalogExercise et Food sans
 * modification.
 *
 * Motif d'erreur repris de src/lib/openFoodFacts.ts (même vocabulaire,
 * mêmes catégories d'échec) :
 *   - found   : le serveur a répondu des items ;
 *   - empty   : liste vide (le serveur a répondu, mais aucun résultat) ;
 *   - server-not-configured : MEAL_SERVER_URL vide, aucun appel réseau ;
 *   - unavailable : réseau KO, timeout, statut non-OK.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

export type CatalogSearchResult<T> =
  | { kind: 'found'; items: T[]; total: number }
  | { kind: 'empty' }
  | { kind: 'server-not-configured' }
  | { kind: 'unavailable' };

function warnInDev(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[catalogApi] ${context}`, error);
  }
}

interface CatalogResponse {
  items: unknown[];
  total: number;
}

async function fetchCatalog<T>(
  path: string,
  query: string,
  limit: number,
  offset: number,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<CatalogSearchResult<T>> {
  if (!MEAL_SERVER_URL) return { kind: 'server-not-configured' };

  const params = new URLSearchParams();
  if (query) params.set('q', query);
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  const url = `${MEAL_SERVER_URL}${path}?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${MEAL_SERVER_API_KEY}` },
    });

    if (!response.ok) return { kind: 'unavailable' };

    const json = (await response.json()) as CatalogResponse;

    if (!Array.isArray(json.items) || json.items.length === 0) {
      return { kind: 'empty' };
    }

    return { kind: 'found', items: json.items as T[], total: json.total };
  } catch (error) {
    warnInDev(`${path} indisponible (réseau, timeout ou réponse invalide)`, error);
    return { kind: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

export interface CatalogApiOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Recherche des exercices dans le catalogue serveur.
 * Sans `query`, le serveur renvoie tout le catalogue (paginé).
 * `limit` est borné à 200 côté serveur.
 */
export async function searchExercises(
  query: string,
  limit = 50,
  offset = 0,
  options: CatalogApiOptions = {},
): Promise<CatalogSearchResult<CatalogExercise>> {
  return fetchCatalog<CatalogExercise>(
    '/v1/exercises',
    query,
    limit,
    offset,
    options.fetchImpl ?? fetch,
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
}

/**
 * Recherche des aliments dans le catalogue serveur.
 * Sans `query`, le serveur renvoie tout le catalogue (paginé).
 * `limit` est borné à 200 côté serveur.
 */
export async function searchFoods(
  query: string,
  limit = 50,
  offset = 0,
  options: CatalogApiOptions = {},
): Promise<CatalogSearchResult<Food>> {
  return fetchCatalog<Food>(
    '/v1/foods',
    query,
    limit,
    offset,
    options.fetchImpl ?? fetch,
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
}
