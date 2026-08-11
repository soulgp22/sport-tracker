import { sanitizeWeightInput } from '../sanitizeWeightInput';

describe('sanitizeWeightInput', () => {
  it('accepts integer input', () => {
    expect(sanitizeWeightInput('70')).toBe('70');
  });

  it('accepts comma as decimal separator', () => {
    expect(sanitizeWeightInput('70,5')).toBe('70,5');
  });

  it('accepts dot as decimal separator', () => {
    expect(sanitizeWeightInput('70.5')).toBe('70.5');
  });

  it('removes non-numeric characters', () => {
    expect(sanitizeWeightInput('7a0')).toBe('70');
  });

  it('deduplicates multiple separators (comma first)', () => {
    expect(sanitizeWeightInput('70,,5')).toBe('70,5');
  });

  it('keeps only the first separator when multiple present', () => {
    expect(sanitizeWeightInput('70,5,3')).toBe('70,53');
  });

  it('truncates input longer than 6 characters', () => {
    expect(sanitizeWeightInput('1234567890')).toBe('123456');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeWeightInput('')).toBe('');
  });

  it('deduplicates separators with dot', () => {
    expect(sanitizeWeightInput('70..5')).toBe('70.5');
  });

  it('handles mixed separators (comma then dot)', () => {
    expect(sanitizeWeightInput('70,.5')).toBe('70,5');
  });
});
