import {
  __resetForTests,
  debug,
  exportAsText,
  getEntries,
  getSessionInfo,
  info,
  setMinLevel,
} from '../logger';

describe('logger', () => {
  beforeEach(() => {
    __resetForTests();
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('L1 plafonne le tampon à 500 entrées, la plus ancienne jetée', () => {
    for (let i = 0; i < 600; i += 1) {
      info('scope', `msg ${i}`);
    }
    const entries = getEntries();
    expect(entries).toHaveLength(500);
    // La première entrée conservée est la 101e émise.
    expect(entries[0].id).toBe(101);
    expect(entries[0].message).toBe('msg 100');
  });

  it('L2 ne garde pas une entrée debug quand le niveau minimal est warn', () => {
    setMinLevel('warn');
    debug('scope', 'caché');
    expect(getEntries()).toHaveLength(0);
  });

  it('L3 expurge les données à l\'entrée, pas à la lecture', () => {
    info('x', 'y', { token: 'abc' });
    const entries = getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].data).toEqual({ token: '***' });
    // exportAsText lit le tampon interne sans passer par getEntries : si
    // l'expurgation était déplacée vers getEntries, la ligne fuirait 'abc'.
    const entryLines = exportAsText().split('\n').slice(3);
    expect(entryLines.join('\n')).not.toContain('abc');
  });

  it('L4 log() n\'explose pas quand un getter de data lève une exception', () => {
    const evil: Record<string, unknown> = {};
    Object.defineProperty(evil, 'boom', {
      enumerable: true,
      get() {
        throw new Error('boom');
      },
    });
    expect(() => info('scope', 'msg', evil)).not.toThrow();
  });

  it('L5 exportAsText contient l\'en-tête de session et une ligne par entrée', () => {
    info('catalogApi', 'recherche indisponible', { kind: 'unavailable' });

    const text = exportAsText();
    const lines = text.split('\n');
    expect(lines).toHaveLength(4);

    const session = getSessionInfo();
    expect(lines[0]).toContain(session.sessionId);
    expect(lines[1]).toContain(session.appVersion);
    expect(lines[1]).toContain(session.platform);
    expect(lines[2]).toContain(new Date(session.startedAt).toISOString());

    const entryTs = getEntries()[0].ts;
    const iso = new Date(entryTs).toISOString();
    expect(lines[3]).toBe(
      `${iso}  INFO  [catalogApi] recherche indisponible {"kind":"unavailable"}`
    );
  });

  it('L6 getEntries renvoie une copie, pas la référence interne', () => {
    info('scope', 'msg');
    const copy = getEntries();
    copy.length = 0;
    expect(getEntries()).toHaveLength(1);
  });
});
