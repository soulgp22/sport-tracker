import { normalizeRouteParam } from '../routeParamNormalizer';

describe('normalizeRouteParam', () => {
  it('returns undefined for undefined', () => {
    expect(normalizeRouteParam(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(normalizeRouteParam('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(normalizeRouteParam('   ')).toBeUndefined();
  });

  it('returns undefined for an array', () => {
    expect(normalizeRouteParam(['a', 'b'])).toBeUndefined();
  });

  it('returns undefined for a number', () => {
    expect(normalizeRouteParam(42)).toBeUndefined();
  });

  it('trims whitespace', () => {
    expect(normalizeRouteParam('  Riz  ')).toBe('Riz');
  });

  it('bounds at 80 characters', () => {
    const long = 'a'.repeat(500);
    const result = normalizeRouteParam(long);
    expect(result).toBeDefined();
    expect(result!.length).toBe(80);
  });

  it('returns a trimmed string for a valid input', () => {
    expect(normalizeRouteParam('Riz basmati')).toBe('Riz basmati');
  });
});
