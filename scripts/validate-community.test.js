const { spawnSync } = require('node:child_process');
const path = require('node:path');

describe('community content validation', () => {
  it('passes the repository community validator', () => {
    const result = spawnSync(process.execPath, ['scripts/validate-community.mjs'], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Validation Community réussie');
  });
});
