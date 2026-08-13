/**
 * Expurgation des journaux — fonctions PURES, sans dépendance.
 *
 * Le dépôt est PUBLIC et les journaux seront exportables par l'utilisateur :
 * aucune donnée sensible (clé d'API, jeton, mot de passe, image encodée en
 * base64) ne doit pouvoir y entrer. Ces fonctions sont volontairement pures et
 * indépendantes de l'UI pour être testables isolément.
 */

export type Redacted = string;

/**
 * Clés dont la VALEUR doit être masquée. La comparaison se fait sur le nom de
 * clé normalisé (minuscules) et de façon EXACTE : on n'utilise JAMAIS de
 * correspondance par sous-chaîne (interdit du dépôt). `tokenCount` ne doit pas
 * être masqué.
 */
const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'apikey',
  'api_key',
  'authorization',
  'token',
  'accesstoken',
  'refreshtoken',
  'password',
  'secret',
  'bearer',
]);

const MAX_DEPTH = 4;
const MAX_STRING_LENGTH = 500;
const DATA_IMAGE_PREFIX = 'data:image/';
const AUTHORIZATION_BEARER_PATTERN = /Authorization:\s*Bearer\s+\S+/gi;

export function redactString(value: string): string {
  // (a) toute chaîne commençant par `data:image/` suivie de base64 : on ne
  // conserve que la taille estimée de la charge utile, jamais les octets.
  if (value.startsWith(DATA_IMAGE_PREFIX)) {
    const commaIndex = value.indexOf(',');
    if (commaIndex !== -1) {
      const payload = value.slice(commaIndex + 1);
      const sizeInKb = Math.round((payload.length * 3) / 4 / 1024);
      return `<image ~${sizeInKb} Ko>`;
    }
  }

  let result = value;

  // (b) en-tête d'authentification : on masque la valeur du jeton.
  result = result.replace(AUTHORIZATION_BEARER_PATTERN, 'Authorization: Bearer ***');

  // (c) bornage : aucune chaîne démesurée n'entre dans le tampon.
  if (result.length > MAX_STRING_LENGTH) {
    const remainder = result.length - MAX_STRING_LENGTH;
    result = `${result.slice(0, MAX_STRING_LENGTH)} …(+${remainder} car.)`;
  }

  return result;
}

export function redactValue(value: unknown, depth = 0): unknown {
  return redactValueInternal(value, depth, new WeakSet<object>());
}

function redactValueInternal(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth > MAX_DEPTH) return '<trop profond>';

  if (value === null || value === undefined) return value;

  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'function') return '<fonction>';
  if (typeof value === 'symbol') return String(value);

  // typeof value === 'object'
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: redactString(value.stack ?? ''),
    };
  }

  if (seen.has(value)) return '<circulaire>';
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      const result: unknown[] = [];
      for (let i = 0; i < value.length; i += 1) {
        result.push(redactValueInternal(value[i], depth + 1, seen));
      }
      return result;
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      const normalizedKey = key.toLowerCase();
      const child = (value as Record<string, unknown>)[key];
      if (SENSITIVE_KEYS.has(normalizedKey)) {
        result[key] = '***';
      } else {
        result[key] = redactValueInternal(child, depth + 1, seen);
      }
    }
    return result;
  } finally {
    seen.delete(value);
  }
}
