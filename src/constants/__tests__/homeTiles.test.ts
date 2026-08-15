import { HOME_TILES } from '../homeTiles';

describe('HOME_TILES', () => {
  it('does not contain programs or foods tiles', () => {
    const keys = HOME_TILES.map((t) => t.key);
    expect(keys).not.toContain('programs');
    expect(keys).not.toContain('foods');
  });

  it('contains exactly 4 entries in order: nutrition, exercises, progress, history', () => {
    expect(HOME_TILES).toHaveLength(4);
    expect(HOME_TILES[0].key).toBe('nutrition');
    expect(HOME_TILES[1].key).toBe('exercises');
    expect(HOME_TILES[2].key).toBe('progress');
    expect(HOME_TILES[3].key).toBe('history');
  });
});
