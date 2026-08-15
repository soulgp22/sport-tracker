import { redactString, redactValue } from '../logRedaction';

describe('redactString', () => {
  it('masque la valeur d\'un en-tête Bearer', () => {
    expect(redactString('Authorization: Bearer abc123')).toBe('Authorization: Bearer ***');
  });

  it('masque la valeur Bearer même au milieu d\'une chaîne', () => {
    expect(redactString('headers: Authorization: Bearer abc123')).toBe(
      'headers: Authorization: Bearer ***'
    );
  });
});

describe('redactValue', () => {
  it('R1 masque uniquement les clés sensibles exactes', () => {
    expect(redactValue({ apiKey: 'sk-123', tokenCount: 42 })).toEqual({
      apiKey: '***',
      tokenCount: 42,
    });
  });

  it('R2 remplace la charge utile base64 d\'une image par sa taille estimée', () => {
    const payload = 'x'.repeat(4000);
    const result = redactString(`data:image/jpeg;base64,${payload}`);
    expect(result).toContain('<image');
    expect(result).not.toContain(payload);
    expect(result).toBe('<image ~3 Ko>');
  });

  it('R3 tronque les chaînes de plus de 500 caractères et signale le reste', () => {
    const result = redactString('z'.repeat(900));
    expect(result.startsWith('z'.repeat(500))).toBe(true);
    expect(result).toContain('(+400 car.)');
    expect(result.length).toBeLessThan(900);
  });

  it('R4 ne boucle pas sur un objet circulaire', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(redactValue(circular)).toEqual({ self: '<circulaire>' });
  });

  it('R5 transforme une Error en { name, message, stack }', () => {
    const result = redactValue(new Error('boom')) as {
      name: string;
      message: string;
      stack: string;
    };
    expect(result.name).toBe('Error');
    expect(result.message).toBe('boom');
    expect(typeof result.stack).toBe('string');
  });

  it('borne la profondeur à 4 niveaux', () => {
    expect(redactValue({ a: { b: { c: { d: { e: 1 } } } } })).toEqual({
      a: { b: { c: { d: { e: '<trop profond>' } } } },
    });
  });

  it('remplace une fonction par la sentinelle <fonction>', () => {
    expect(redactValue({ fn: () => 1 })).toEqual({ fn: '<fonction>' });
  });

  it('laisse les primitives intactes', () => {
    expect(redactValue(42)).toBe(42);
    expect(redactValue(true)).toBe(true);
    expect(redactValue(null)).toBeNull();
    expect(redactValue(undefined)).toBeUndefined();
  });

  it('masque les clés sensibles en profondeur', () => {
    expect(redactValue({ auth: { token: 't', nested: { password: 'p' } } })).toEqual({
      auth: { token: '***', nested: { password: '***' } },
    });
  });
});
