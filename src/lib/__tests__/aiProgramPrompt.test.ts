import { combineAiProgramPrompt } from '../aiProgramPrompt';

describe('combineAiProgramPrompt', () => {
  it('keeps automatic instructions and user constraints in explicit sections', () => {
    const result = combineAiProgramPrompt('FORMAT JSON STRICT', '3 séances, douleur au genou');
    expect(result.indexOf('FORMAT JSON STRICT')).toBeLessThan(result.indexOf('3 séances'));
    expect(result).toContain('DESCRIPTION PERSONNALISÉE');
    expect(result).toContain('FIN DE LA DESCRIPTION');
  });

  it('makes an empty description explicit', () => {
    expect(combineAiProgramPrompt('FORMAT', '  ')).toContain('Aucune contrainte');
  });
});
