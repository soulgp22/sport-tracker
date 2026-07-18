export function combineAiProgramPrompt(automaticPrompt: string, programDescription: string) {
  const personalized = programDescription.trim() || 'Aucune contrainte personnalisée renseignée.';
  return [
    '=== INSTRUCTIONS AUTOMATIQUES LIFE SPORT TRACKER ===',
    automaticPrompt.trim(),
    '',
    '=== DESCRIPTION PERSONNALISÉE DE L’UTILISATEUR ===',
    personalized,
    '=== FIN DE LA DESCRIPTION PERSONNALISÉE ===',
  ].join('\n');
}
