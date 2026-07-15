export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

export const IMPORT_FILE_TOO_LARGE_MESSAGE =
  "Le fichier dépasse la taille maximale autorisée de 5 Mo.";

export function assertImportFileSize(size?: number | null): void {
  if (typeof size === 'number' && size > MAX_IMPORT_FILE_BYTES) {
    throw new Error(IMPORT_FILE_TOO_LARGE_MESSAGE);
  }
}

export function assertImportTextSize(text: string): void {
  if (text.length > MAX_IMPORT_FILE_BYTES) {
    throw new Error(IMPORT_FILE_TOO_LARGE_MESSAGE);
  }
}

export function getImportErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message === IMPORT_FILE_TOO_LARGE_MESSAGE
    ? error.message
    : fallback;
}
