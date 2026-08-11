/** Poids saisi : chiffres + un seul séparateur décimal (, ou .), borné à 6 caractères. */
export function sanitizeWeightInput(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, '');
  const firstSeparator = cleaned.search(/[.,]/);
  if (firstSeparator === -1) return cleaned.slice(0, 6);
  const head = cleaned.slice(0, firstSeparator + 1);
  const tail = cleaned.slice(firstSeparator + 1).replace(/[.,]/g, '');
  return (head + tail).slice(0, 6);
}
