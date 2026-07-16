/**
 * Registre des animations HD sous licence.
 *
 * Les entrées peuvent pointer vers un GIF ou un WebP animé hébergé sur un CDN
 * ou dans un dépôt GitHub contrôlé. Le lecteur conserve automatiquement les
 * deux images hors ligne de free-exercise-db comme solution de secours.
 *
 * Ne jamais ajouter une animation sans renseigner sa provenance et sa licence.
 */
export interface ExerciseMediaEntry {
  animatedUrl: string;
  posterUrl?: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
}

export const exerciseMedia: Record<string, ExerciseMediaEntry> = {};
