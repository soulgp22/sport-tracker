import {
  ACTIVITY_FACTORS,
  calculateBmr,
  calculateTdee,
  isEnergyProfileComplete,
  missingEnergyProfileFields,
  type EnergyProfile,
} from '../energyBalance';

const homme80kg: EnergyProfile = {
  sex: 'male',
  weightKg: 80,
  heightCm: 180,
  ageYears: 30,
  activityLevel: 'sedentary',
};

describe('energyBalance', () => {
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
