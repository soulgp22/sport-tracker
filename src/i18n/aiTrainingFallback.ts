/**
 * Textes FR de la « roue à données » photo de repas (opt-in IA).
 *
 * Même pattern que mealPhotoFallback : translations.ts n'est PAS modifié,
 * tant que les clés n'y sont pas ajoutées `translate()` retourne la clé
 * brute et ce module fournit le texte FR de repli. Une fois les clés
 * ajoutées (bloc JSON fourni dans le rapport), `aiTrainingT` utilisera
 * automatiquement les vraies traductions.
 */

type TranslateFn = (key: string, variables?: Record<string, string | number>) => string;

export const AI_TRAINING_TEXTS_FR: Record<string, string> = {
  'settings.dataPrivacy': 'Données & confidentialité',
  'settings.aiTrainingToggle': "Contribuer à l'amélioration de l'IA",
  'settings.aiTrainingHelp':
    "Anonyme, sans photos : seules tes corrections textuelles (aliments, grammes) sont conservées sur l'appareil pour entraîner de futurs modèles. Désactivé par défaut.",
  'settings.aiTrainingCount': '{{count}} enregistrements conservés',
  'settings.aiTrainingExport': "Exporter les données d'entraînement",
  'settings.aiTrainingClear': "Effacer les données d'entraînement",
  'dialog.aiTrainingClearTitle': "Effacer les données d'entraînement ?",
  'dialog.aiTrainingClearMessage':
    "Tous les enregistrements de corrections conservés sur l'appareil seront définitivement supprimés.",
  'dialog.aiTrainingClearConfirm': 'Effacer',
};

/**
 * Comme `t()`, mais retombe sur le texte FR local tant que la clé
 * n'existe pas dans translations.ts.
 */
export function aiTrainingT(
  t: TranslateFn,
  key: string,
  variables?: Record<string, string | number>
): string {
  const translated = t(key, variables);
  if (translated !== key) return translated;

  let fallback = AI_TRAINING_TEXTS_FR[key] ?? key;
  if (variables) {
    for (const [name, replacement] of Object.entries(variables)) {
      fallback = fallback.replaceAll(`{{${name}}}`, String(replacement));
    }
  }
  return fallback;
}
