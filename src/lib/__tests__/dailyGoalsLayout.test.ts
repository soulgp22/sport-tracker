import {
  cardMetrics,
  chooseDailyGoalsLayout,
  dailyGoalsMetrics,
  pillMetrics,
} from '../widgets/dailyGoalsLayout';

describe('chooseDailyGoalsLayout', () => {
  it('un bandeau 4×1 (large et bas) donne la pilule', () => {
    expect(chooseDailyGoalsLayout(320, 60)).toBe('pill');
    // Cellule haute mais tres large : toujours un bandeau.
    expect(chooseDailyGoalsLayout(340, 130)).toBe('pill');
  });

  it('une cellule 2×2 ou carree donne la carte', () => {
    expect(chooseDailyGoalsLayout(160, 160)).toBe('card');
    expect(chooseDailyGoalsLayout(180, 140)).toBe('card');
  });

  it('un 4×2 (ratio intermediaire, assez haut) donne la carte', () => {
    expect(chooseDailyGoalsLayout(320, 180)).toBe('card');
  });

  it('une taille inconnue ou nulle tombe sur la pilule', () => {
    expect(chooseDailyGoalsLayout(0, 0)).toBe('pill');
    expect(chooseDailyGoalsLayout(Number.NaN, 100)).toBe('pill');
  });
});

describe('metriques', () => {
  it('la pilule borne sa hauteur et grossit son chiffre avec la cellule', () => {
    const low = pillMetrics(320, 40);
    const tall = pillMetrics(320, 200);
    expect(low.height).toBe(48);
    expect(tall.height).toBe(76);
    expect(tall.valueFontSize).toBeGreaterThan(low.valueFontSize);
    expect(low.ringSize).toBeLessThan(low.height);
  });

  it("la carte dimensionne l'anneau sur le plus petit cote et garde une barre utile", () => {
    const small = cardMetrics(150, 150);
    const big = cardMetrics(300, 300);
    expect(big.ringSize).toBeGreaterThan(small.ringSize);
    expect(small.ringSize).toBeGreaterThanOrEqual(72);
    expect(big.ringSize).toBeLessThanOrEqual(140);
    expect(small.barWidth).toBeGreaterThanOrEqual(24);
    expect(small.ringValueFontSize).toBeGreaterThanOrEqual(18);
  });

  it('dailyGoalsMetrics suit la disposition choisie', () => {
    expect(dailyGoalsMetrics(320, 60).layout).toBe('pill');
    expect(dailyGoalsMetrics(160, 160).layout).toBe('card');
  });
});
