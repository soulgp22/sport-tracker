/**
 * URL de base par défaut pour les animations d'exercices hébergées sur GitHub.
 *
 * Les fichiers WebP sont générés par scripts/generate-all-media.py et poussés
 * dans media/exercices/ (hors Git LFS) pour que GitHub raw renvoie l'image
 * réelle et non un pointeur LFS.
 *
 * Cette constante sert de repli quand l'utilisateur n'a pas installé le pack
 * « exercises-complete-v1 » (remoteMediaBaseUrl absent).
 *
 * Le nom de fichier distant attendu est <id>.webp (ex. offline-001.webp).
 */
export const DEFAULT_EXERCISE_MEDIA_BASE_URL =
  'https://raw.githubusercontent.com/soulgp22/sport-tracker/main/media/exercises/';

/**
 * Construit l'URL distante complète pour l'animation d'un exercice.
 *
 * @param id  Identifiant de l'exercice (ex. "offline-001")
 * @param baseUrl  URL de base optionnelle ; utilise DEFAULT_EXERCISE_MEDIA_BASE_URL si absente
 * @returns URL complète vers le WebP animé
 */
export function buildExerciseMediaUrl(
  id: string,
  baseUrl?: string,
): string {
  const base = baseUrl ?? DEFAULT_EXERCISE_MEDIA_BASE_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${id}.webp`;
}
