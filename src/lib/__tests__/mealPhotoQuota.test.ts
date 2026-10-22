import {
  DAILY_MEAL_PHOTO_LIMIT,
  PREMIUM_DAILY_MEAL_PHOTO_LIMIT,
  consumeQuota,
  limitForTier,
  mergeServerQuota,
  quotaDayKey,
  resolveQuota,
} from '../mealPhotoQuota';

describe('mealPhotoQuota — 2 repas par jour', () => {
  const TODAY = '2026-09-16';
  const YESTERDAY = '2026-09-15';

  it('expose une limite de 2', () => {
    expect(DAILY_MEAL_PHOTO_LIMIT).toBe(2);
  });

  it('part d’un quota plein sans etat enregistre', () => {
    expect(resolveQuota(null, TODAY)).toEqual({
      used: 0,
      remaining: 2,
      reached: false,
      limit: 2,
      tier: 'free',
    });
  });

  it('decompte les repas du jour', () => {
    expect(resolveQuota({ date: TODAY, mealsAnalyzed: 1 }, TODAY)).toMatchObject({
      used: 1,
      remaining: 1,
      reached: false,
    });
  });

  it('bloque au deuxieme repas', () => {
    expect(resolveQuota({ date: TODAY, mealsAnalyzed: 2 }, TODAY)).toMatchObject({
      remaining: 0,
      reached: true,
    });
  });

  /**
   * Le compteur se remet a zero au changement de date sans tache planifiee :
   * un etat portant sur un autre jour est simplement ignore.
   */
  it('remet le compteur a zero le lendemain', () => {
    expect(resolveQuota({ date: YESTERDAY, mealsAnalyzed: 2 }, TODAY)).toMatchObject({
      used: 0,
      remaining: 2,
      reached: false,
    });
  });

  it('consomme un repas et bascule le jour si besoin', () => {
    expect(consumeQuota({ date: TODAY, mealsAnalyzed: 1 }, TODAY)).toEqual({
      date: TODAY,
      mealsAnalyzed: 2,
    });
    expect(consumeQuota({ date: YESTERDAY, mealsAnalyzed: 2 }, TODAY)).toEqual({
      date: TODAY,
      mealsAnalyzed: 1,
    });
    expect(consumeQuota(null, TODAY)).toEqual({ date: TODAY, mealsAnalyzed: 1 });
  });

  it('resiste a un etat corrompu', () => {
    expect(resolveQuota({ date: TODAY, mealsAnalyzed: -5 }, TODAY)).toMatchObject({
      used: 0,
      remaining: 2,
      reached: false,
    });
    expect(resolveQuota({ date: TODAY, mealsAnalyzed: 99 }, TODAY)).toMatchObject({
      remaining: 0,
      reached: true,
    });
  });

  /** Jour LOCAL et non UTC : le quota doit suivre la journee de l'utilisateur. */
  it('utilise la date locale', () => {
    const d = new Date(2026, 8, 16, 23, 30); // 16 septembre 23h30 local
    expect(quotaDayKey(d)).toBe('2026-09-16');
  });
});

describe('mealPhotoQuota — abonnement (100 repas par jour)', () => {
  const TODAY = '2026-09-22';

  it('donne 100 repas au palier abonne, 2 au gratuit', () => {
    expect(limitForTier('premium')).toBe(100);
    expect(PREMIUM_DAILY_MEAL_PHOTO_LIMIT).toBe(100);
    expect(limitForTier('free')).toBe(2);
    expect(resolveQuota({ date: TODAY, mealsAnalyzed: 2 }, TODAY, 'premium')).toMatchObject({
      reached: false,
      remaining: 98,
    });
  });
});

describe('mergeServerQuota — le serveur et le telephone', () => {
  const TODAY = '2026-09-22';
  const local = (n: number) => ({ date: TODAY, mealsAnalyzed: n });
  const server = (used: number, tier: 'free' | 'premium' = 'free') => ({ day: TODAY, tier, limit: limitForTier(tier), used });

  /**
   * Apres une reinstallation, le compteur local repart a zero mais le serveur
   * se souvient : c'est tout l'interet du quota serveur.
   */
  it('retient le compteur du serveur quand le telephone a oublie', () => {
    expect(mergeServerQuota(local(0), server(2), TODAY)).toMatchObject({ used: 2, reached: true });
  });

  it('retient le compteur local quand le serveur ne sait pas encore (hors ligne)', () => {
    expect(mergeServerQuota(local(2), server(1), TODAY)).toMatchObject({ used: 2, reached: true });
  });

  it('prend le palier du serveur', () => {
    expect(mergeServerQuota(local(2), server(2, 'premium'), TODAY)).toMatchObject({
      tier: 'premium',
      limit: 100,
      reached: false,
    });
  });

  /**
   * Juste apres l'achat, le cache du serveur peut encore dire « gratuit » :
   * l'ecran ne doit pas rester bloque. Le serveur tranche a l'analyse.
   */
  it('affiche le palier abonne connu localement meme si le serveur est en retard', () => {
    expect(mergeServerQuota(local(2), server(2, 'free'), TODAY, 'premium')).toMatchObject({
      tier: 'premium',
      reached: false,
    });
  });

  it('ignore une reponse du serveur portant sur un autre jour', () => {
    const stale = { day: '2026-09-21', tier: 'free' as const, limit: 2, used: 2 };
    expect(mergeServerQuota(local(0), stale, TODAY)).toMatchObject({ used: 0, reached: false });
  });
});
