import {
  assertImportFileSize,
  assertImportTextSize,
  getImportErrorMessage,
  IMPORT_FILE_TOO_LARGE_MESSAGE,
  MAX_IMPORT_FILE_BYTES,
} from '../importLimits';

describe('importLimits', () => {
  it('accepts files at or below the limit', () => {
    expect(() => assertImportFileSize(MAX_IMPORT_FILE_BYTES)).not.toThrow();
    expect(() => assertImportFileSize(undefined)).not.toThrow();
  });

  it('rejects oversized files and text payloads', () => {
    expect(() => assertImportFileSize(MAX_IMPORT_FILE_BYTES + 1)).toThrow(
      IMPORT_FILE_TOO_LARGE_MESSAGE
    );
    expect(() => assertImportTextSize('x'.repeat(MAX_IMPORT_FILE_BYTES + 1))).toThrow(
      IMPORT_FILE_TOO_LARGE_MESSAGE
    );
  });

  it('only exposes the safe import-size message', () => {
    expect(getImportErrorMessage(new Error(IMPORT_FILE_TOO_LARGE_MESSAGE), 'fallback')).toBe(
      IMPORT_FILE_TOO_LARGE_MESSAGE
    );
    expect(getImportErrorMessage(new Error('internal detail'), 'fallback')).toBe('fallback');
  });
});
