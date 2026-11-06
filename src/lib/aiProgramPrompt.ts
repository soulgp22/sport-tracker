import { APP_NAME } from '../config/brand';

export function combineAiProgramPrompt(automaticPrompt: string, programDescription: string) {
  const personalized = programDescription.trim() || 'Aucune contrainte personnalisée renseignée.';
  return [
    `=== INSTRUCTIONS AUTOMATIQUES ${APP_NAME.toUpperCase()} ===`,
    automaticPrompt.trim(),
    '',
    '=== DESCRIPTION PERSONNALISÉE DE L’UTILISATEUR ===',
    personalized,
    '=== FIN DE LA DESCRIPTION PERSONNALISÉE ===',
  ].join('\n');
}
