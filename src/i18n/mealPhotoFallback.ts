/**
 * Textes FR de la feature « photo de repas » (spike).
 *
 * translations.ts n'est PAS modifié pour ce spike : tant que les clés
 * mealPhoto.* n'y sont pas ajoutées, `translate()` retourne la clé brute.
 * Ce module fournit donc le texte FR de repli pour que la feature reste
 * utilisable immédiatement. Une fois les clés ajoutées à translations.ts
 * (bloc JSON fourni dans le rapport du spike), `mealPhotoT` utilisera
 * automatiquement les vraies traductions.
 */

type TranslateFn = (key: string, variables?: Record<string, string | number>) => string;

export const MEAL_PHOTO_TEXTS_FR: Record<string, string> = {
  'mealPhoto.button': 'Analyser une photo de repas',
  'mealPhoto.title': 'Photo de repas',
  'mealPhoto.takePhoto': 'Prendre une photo',
  'mealPhoto.pickFromGallery': 'Choisir depuis la galerie',
  'mealPhoto.permissionCamera': "L'accès à l'appareil photo est nécessaire pour photographier ton repas.",
  'mealPhoto.permissionCta': 'Autoriser',
  'mealPhoto.downloading': 'Téléchargement du modèle IA… {{percent}} %',
  'mealPhoto.downloadWarning':
    "Environ 4,5 Go : connexion wifi recommandée. Garde l'app ouverte pendant le téléchargement.",
  'mealPhoto.modelLoading': 'Chargement du modèle IA…',
  'mealPhoto.analyzing': 'Analyse de la photo… (10 à 30 s)',
  'mealPhoto.closing': "Arrêt de l'analyse en cours…",
  'mealPhoto.warningBanner': "Estimation à vérifier — l'IA se trompe sur les quantités.",
  'mealPhoto.license': 'Modèle Gemma 4 E2B (Google) — Gemma Terms of Use',
  'mealPhoto.notFound': 'Non trouvé',
  'mealPhoto.searchManually': 'Rechercher manuellement',
  'mealPhoto.searchPlaceholder': 'Rechercher un aliment…',
  'mealPhoto.remove': 'Retirer',
  'mealPhoto.addAll': 'Tout ajouter',
  'mealPhoto.retry': 'Réessayer',
  'mealPhoto.errorTitle': 'Analyse impossible',
  'mealPhoto.errorMessage': "Le modèle n'a pas pu analyser la photo. Réessaie plus tard.",
  'mealPhoto.downloadInterrupted':
    "Le téléchargement du modèle a été interrompu. Rouvre cet écran et garde l'app au premier plan jusqu'à la fin.",
  'mealPhoto.totalTitle': 'Total estimé',
  'mealPhoto.totalHint':
    "Consultation libre : rien n'est enregistré tant que tu n'appuies pas sur « Tout ajouter ».",
  'mealPhoto.emptyTitle': 'Aucun aliment reconnu',
  'mealPhoto.emptyMessage': "L'IA n'a rien reconnu sur cette photo. Tu peux réessayer ou saisir ton repas manuellement.",
  'mealPhoto.manualEntry': 'Saisie manuelle',
};

/**
 * Comme `t()`, mais retombe sur le texte FR local tant que la clé
 * mealPhoto.* n'existe pas dans translations.ts.
 */
export function mealPhotoT(
  t: TranslateFn,
  key: string,
  variables?: Record<string, string | number>
): string {
  const translated = t(key, variables);
  if (translated !== key) return translated;

  let fallback = MEAL_PHOTO_TEXTS_FR[key] ?? key;
  if (variables) {
    for (const [name, replacement] of Object.entries(variables)) {
      fallback = fallback.replaceAll(`{{${name}}}`, String(replacement));
    }
  }
  return fallback;
}
