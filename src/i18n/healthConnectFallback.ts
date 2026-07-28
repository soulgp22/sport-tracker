/**
 * Textes FR de la carte « Bilan du jour » / Health Connect.
 *
 * Même pattern que mealPhotoFallback : tant que ces clés ne sont pas
 * ajoutées à translations.ts, `translate()` retourne la clé brute et ce
 * module fournit le texte FR de repli. Une fois le bloc JSON du rapport
 * inséré dans translations.ts (fr/en/es/de), `healthConnectT` utilisera
 * automatiquement les vraies traductions.
 */

type TranslateFn = (key: string, variables?: Record<string, string | number>) => string;

export const HEALTH_CONNECT_TEXTS_FR: Record<string, string> = {
  'nutrition.balance.missingFields': 'Il manque : {{fields}}.',
  'nutrition.balance.field.sex': 'ton sexe',
  'nutrition.balance.field.weight': 'ton poids',
  'nutrition.balance.field.height': 'ta taille',
  'nutrition.balance.field.age': 'ton âge',
  'nutrition.healthConnect.installTitle': 'Health Connect n’est pas installé',
  'nutrition.healthConnect.installMessage':
    'Cette fonction utilise Health Connect, l’application Google qui centralise tes données de santé. Installe-la depuis le Play Store, rouvre Life Sport Tracker puis touche à nouveau « Connecter ».',
  'nutrition.healthConnect.updateTitle': 'Health Connect doit être mis à jour',
  'nutrition.healthConnect.updateMessage':
    'Ta version de Health Connect est trop ancienne. Mets-la à jour depuis le Play Store, rouvre Life Sport Tracker puis touche à nouveau « Connecter ».',
  'nutrition.healthConnect.openPlayStore': 'Ouvrir le Play Store',
  'nutrition.healthConnect.later': 'Plus tard',
  'nutrition.healthConnect.deniedTitle': 'Permissions non accordées',
  'nutrition.healthConnect.deniedMessage':
    'Health Connect n’a pas autorisé la lecture des calories et des pas. Tu peux les activer dans Health Connect → Autorisations d’accès → Life Sport Tracker.',
  'nutrition.healthConnect.openSettings': 'Ouvrir les réglages',
  'nutrition.healthConnect.errorTitle': 'Connexion à Health Connect impossible',
};

/**
 * Comme `t()`, mais retombe sur le texte FR local tant que la clé
 * n'existe pas dans translations.ts.
 */
export function healthConnectT(
  t: TranslateFn,
  key: string,
  variables?: Record<string, string | number>
): string {
  const translated = t(key, variables);
  if (translated !== key) return translated;

  let fallback = HEALTH_CONNECT_TEXTS_FR[key] ?? key;
  if (variables) {
    for (const [name, replacement] of Object.entries(variables)) {
      fallback = fallback.replaceAll(`{{${name}}}`, String(replacement));
    }
  }
  return fallback;
}
