import {
  ACTIVITY_FACTORS,
  ENERGY_SOURCE_LABEL_KEYS,
  calculateBmr,
  calculateTdee,
  estimateActiveCaloriesFromSteps,
  isEnergyProfileComplete,
  missingEnergyProfileFields,
  resolveDailyEnergyBalance,
  resolveDailyEnergyExpenditure,
  type EnergyProfile,
} from '../energyBalance';
import { TRANSLATIONS } from '../../i18n/translations';

const homme80kg: EnergyProfile = {
  sex: 'male',
  weightKg: 80,
  heightCm: 180,
  ageYears: 30,
  activityLevel: 'sedentary',
};

describe('energyBalance', () => {
  describe('estimateActiveCaloriesFromSteps', () => {
    it.each([
      { steps: 10_000, weightKg: 70, expected: 350 },
      { steps: 5_000, weightKg: 80, expected: 200 },
      { steps: 0, weightKg: 70, expected: 0 },
    ])('$steps pas a $weightKg kg = $expected kcal', ({ steps, weightKg, expected }) => {
      expect(estimateActiveCaloriesFromSteps(steps, weightKg)).toEqual({
        activeCaloriesKcal: expected,
        weightKg,
        usedDefaultWeight: false,
      });
    });

    it('utilise 70 kg et remonte l indicateur quand le poids est absent', () => {
      expect(estimateActiveCaloriesFromSteps(10_000)).toEqual({
        activeCaloriesKcal: 350,
        weightKg: 70,
        usedDefaultWeight: true,
      });
    });
  });

  describe('resolveDailyEnergyExpenditure', () => {
    const frenchLabel = (key: keyof typeof TRANSLATIONS.fr) => TRANSLATIONS.fr[key];

    it('priorise les calories Health Connect et leur libelle', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: { total: 0, active: 450 },
        healthSteps: 10_000,
        tdee: 2_000,
        profileComplete: true,
        weightKg: 70,
      });

      expect(result.burnedKcal).toBe(450);
      expect(frenchLabel(result.sourceLabelKey)).toBe('Source : Health Connect');
    });

    it('utilise le TDEE et les calories estimees quand seuls les pas sont presents', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: { total: 0, active: 0 },
        healthSteps: 10_000,
        tdee: 2_000,
        profileComplete: true,
        weightKg: 70,
      });

      expect(result.burnedKcal).toBe(2_350);
      expect(result.activeCaloriesKcal).toBe(350);
      expect(frenchLabel(result.sourceLabelKey)).toBe(
        'Estimation d\'après tes pas (Health Connect)'
      );
    });

    it('n affiche que les calories actives des pas si le profil est incomplet', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: null,
        healthSteps: 10_000,
        tdee: null,
        profileComplete: false,
      });

      expect(result.burnedKcal).toBe(350);
      expect(result.activeCaloriesOnly).toBe(true);
      expect(result.usedDefaultWeight).toBe(true);
    });

    it('utilise le TDEE seul et le libelle profil sans donnees Health Connect', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: null,
        healthSteps: 0,
        tdee: 2_136,
        profileComplete: true,
        weightKg: 80,
      });

      expect(result.burnedKcal).toBe(2_136);
      expect(frenchLabel(result.sourceLabelKey)).toBe('Estimation d\'après ton profil');
    });

    it('retourne une depense inconnue et son libelle quand aucune source n est exploitable', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: null,
        healthSteps: null,
        tdee: null,
        profileComplete: false,
      });

      expect(result.burnedKcal).toBeNull();
      expect(frenchLabel(result.sourceLabelKey)).toBe('Dépense indisponible');
    });

    it('n emet aucun excedent quand la depense est inconnue', () => {
      expect(resolveDailyEnergyBalance(null, 135)).toEqual({ status: 'unavailable' });
      expect(ENERGY_SOURCE_LABEL_KEYS.unknown).toBe('nutrition.balance.sourceUnavailable');
    });
  });

  describe('calculateBmr (Mifflin-St Jeor)', () => {
    it('homme 80 kg, 180 cm, 30 ans = 1780 kcal', () => {
      // 10×80 + 6,25×180 − 5×30 + 5 = 800 + 1125 − 150 + 5 = 1780
      expect(calculateBmr(homme80kg)).toBe(1780);
    });

    it('femme 80 kg, 180 cm, 30 ans = 1614 kcal', () => {
      // 1780 − 5 − 161 = 1614
      expect(calculateBmr({ ...homme80kg, sex: 'female' })).toBe(1614);
    });

    it('retourne null si le sexe est non précisé', () => {
      expect(calculateBmr({ ...homme80kg, sex: 'unspecified' })).toBeNull();
    });

    it('retourne null si poids, taille ou âge manquent ou sont invalides', () => {
      expect(calculateBmr({ ...homme80kg, weightKg: undefined })).toBeNull();
      expect(calculateBmr({ ...homme80kg, heightCm: undefined })).toBeNull();
      expect(calculateBmr({ ...homme80kg, ageYears: undefined })).toBeNull();
      expect(calculateBmr({ ...homme80kg, weightKg: 0 })).toBeNull();
      expect(calculateBmr({ ...homme80kg, heightCm: -10 })).toBeNull();
      expect(calculateBmr({ ...homme80kg, ageYears: 0 })).toBeNull();
    });
  });

  describe('calculateTdee', () => {
    it('applique le facteur sédentaire (1,2)', () => {
      // 1780 × 1,2 = 2136
      expect(calculateTdee(homme80kg)).toBe(2136);
    });

    it('applique les facteurs léger, modéré et actif', () => {
      expect(calculateTdee({ ...homme80kg, activityLevel: 'light' })).toBe(
        Math.round(1780 * 1.375)
      );
      expect(calculateTdee({ ...homme80kg, activityLevel: 'moderate' })).toBe(
        Math.round(1780 * 1.55)
      );
      expect(calculateTdee({ ...homme80kg, activityLevel: 'active' })).toBe(
        Math.round(1780 * 1.725)
      );
    });

    it('retourne null si le profil est incomplet', () => {
      expect(calculateTdee({ ...homme80kg, heightCm: undefined })).toBeNull();
    });

    it('expose les facteurs attendus', () => {
      expect(ACTIVITY_FACTORS).toEqual({
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
      });
    });
  });

  describe('isEnergyProfileComplete', () => {
    it('true quand le BMR est calculable', () => {
      expect(isEnergyProfileComplete(homme80kg)).toBe(true);
    });

    it('false sinon', () => {
      expect(isEnergyProfileComplete({ ...homme80kg, sex: 'unspecified' })).toBe(false);
    });
  });

  describe('missingEnergyProfileFields', () => {
    it('retourne une liste vide quand le profil est complet', () => {
      expect(
        missingEnergyProfileFields({ sex: 'male', heightCm: 180, ageYears: 30 }, 80)
      ).toEqual([]);
    });

    it('signale le sexe non précisé et le poids manquant', () => {
      expect(
        missingEnergyProfileFields({ sex: 'unspecified', heightCm: 180, ageYears: 30 }, undefined)
      ).toEqual(['sex', 'weight']);
    });

    it('signale la taille et l’âge manquants', () => {
      expect(
        missingEnergyProfileFields({ sex: 'female', heightCm: undefined, ageYears: undefined }, 65)
      ).toEqual(['height', 'age']);
    });

    it('signale tous les champs dans l’ordre sexe, poids, taille, âge', () => {
      expect(
        missingEnergyProfileFields({ sex: 'unspecified', heightCm: undefined, ageYears: undefined })
      ).toEqual(['sex', 'weight', 'height', 'age']);
    });

    it('traite les valeurs à 0 ou négatives comme manquantes', () => {
      expect(missingEnergyProfileFields({ sex: 'male', heightCm: 0, ageYears: -5 }, 0)).toEqual([
        'weight',
        'height',
        'age',
      ]);
    });
  });
});
