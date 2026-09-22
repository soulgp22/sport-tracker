import {
  DAILY_MEAL_PHOTO_LIMIT,
  consumeQuota,
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
