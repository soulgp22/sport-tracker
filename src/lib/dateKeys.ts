/**
 * Cles de date LOCALES (jour, mois, annee).
 *
 * Toujours locales, jamais UTC : une seance faite a 23 h 30 appartient au jour
 * de l'utilisateur, pas au lendemain UTC. `toISOString().slice(0, 10)` donne la
 * date UTC et decale d'un jour les activites de fin de soiree.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** AAAA-MM-JJ en heure locale. */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** AAAA-MM en heure locale. */
export function localMonthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** AAAA en heure locale. */
export function localYearKey(date: Date): string {
  return String(date.getFullYear());
}

/** Minuit local du jour designe par une cle AAAA-MM-JJ. */
export function startOfLocalDay(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Derniere milliseconde du jour local designe par une cle AAAA-MM-JJ. */
export function endOfLocalDay(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/** Toutes les cles de jour de `from` a `to` inclus, dans l'ordre. */
export function eachDayKey(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= end) {
    keys.push(localDayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}
