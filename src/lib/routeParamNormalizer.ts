/**
 * Normalise un paramètre de route (provenant de `useLocalSearchParams`)
 * en une chaîne de caractères sûre, ou `undefined`.
 *
 * Les paramètres de route sont non fiables : ils peuvent être absents,
 * vides, être un tableau, un nombre, ou une chaîne trop longue.
 * Cette fonction les transforme en une valeur propre pour l'UI.
 *
 * @returns une chaîne nettoyée si exploitable, `undefined` sinon.
 */
export function normalizeRouteParam(
  value: unknown
): string | undefined {
  if (Array.isArray(value)) return undefined;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  return trimmed.slice(0, 80);
}
