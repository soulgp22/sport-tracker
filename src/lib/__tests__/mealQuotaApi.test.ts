import {
  buildConsumeRequest,
  buildQuotaStatusRequest,
  createAnalysisId,
  currentUtcOffsetMinutes,
  parseQuotaStatus,
  quotaHeaders,
} from '../mealQuotaApi';
import { toDeviceId } from '../deviceIdentity';

const IDENTITY = { deviceId: 'and-0123456789abcdef', utcOffsetMinutes: 120 };

describe('mealQuotaApi — contrat du quota serveur', () => {
  /**
   * getTimezoneOffset renvoie UTC - local : a Paris l'ete, -120. Le serveur
   * attend l'inverse (+120) pour retrouver le jour local.
   */
  it('inverse le signe de getTimezoneOffset', () => {
    const paris = { getTimezoneOffset: () => -120 } as Date;
    const newYork = { getTimezoneOffset: () => 240 } as Date;
    expect(currentUtcOffsetMinutes(paris)).toBe(120);
    expect(currentUtcOffsetMinutes(newYork)).toBe(-240);
  });

  it('n’ajoute aucun en-tete sans identite (ancienne version, web)', () => {
    expect(quotaHeaders(null)).toEqual({});
    expect(quotaHeaders(IDENTITY)).toEqual({ 'X-Device-Id': IDENTITY.deviceId, 'X-Utc-Offset': '120' });
  });

  it('construit les requetes d’etat et de declaration', () => {
    const status = buildQuotaStatusRequest(IDENTITY, { refresh: true });
    expect(status.url).toMatch(/\/v1\/quota\?refresh=1$/);
    expect(status.headers['X-Device-Id']).toBe(IDENTITY.deviceId);

    const consume = buildConsumeRequest(IDENTITY, 'a-1');
    expect(consume.url).toMatch(/\/v1\/quota\/consume$/);
    expect(JSON.parse(consume.body)).toEqual({ analysisId: 'a-1' });
  });

  it('lit l’etat, a plat ou dans un refus 402', () => {
    const quota = { day: '2026-09-22', tier: 'premium', limit: 100, used: 3 };
    expect(parseQuotaStatus({ quota })).toEqual(quota);
    expect(parseQuotaStatus({ error: { code: 'quota_exceeded' }, quota })).toEqual(quota);
    expect(parseQuotaStatus(quota)).toEqual(quota);
  });

  it('rejette une reponse inattendue', () => {
    expect(parseQuotaStatus(null)).toBeNull();
    expect(parseQuotaStatus({ quota: { day: 'hier', tier: 'free', limit: 2, used: 0 } })).toBeNull();
    expect(parseQuotaStatus({ quota: { day: '2026-09-22', tier: 'gold', limit: 2, used: 0 } })).toBeNull();
    expect(parseQuotaStatus({ quota: { day: '2026-09-22', tier: 'free', limit: '2', used: 0 } })).toBeNull();
  });

  it('produit des identifiants d’analyse acceptes par le serveur et distincts', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createAnalysisId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{6,80}$/);
  });
});

describe('deviceIdentity', () => {
  it('prefixe l’ANDROID_ID et respecte le format du serveur', () => {
    expect(toDeviceId('0123456789abcdef')).toBe('and-0123456789abcdef');
    expect(toDeviceId('  ')).toBeNull();
    expect(toDeviceId(null)).toBeNull();
    expect(toDeviceId('../../etc/passwd')).toBeNull();
  });
});
