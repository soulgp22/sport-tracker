import {
  ACTIVITY_FACTORS,
  BASAL_SOURCE_LABEL_KEYS,
  ACTIVITY_SOURCE_LABEL_KEYS,
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

// BMR = 10×80 + 6.25×180 − 5×30 + 5 = 800 + 1125 − 150 + 5 = 1780
const BMR_HOMME80 = 1780;

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

    // ---------- Tests adaptes au nouveau contrat ----------

    it('decompose en basal + activite quand Health Connect actif est present', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: { total: 0, active: 450 },
        healthSteps: 10_000,
        profile: homme80kg,
      });

      expect(result.basalKcal).toBe(BMR_HOMME80);
      expect(result.activityKcal).toBe(450);
      expect(result.totalKcal).toBe(BMR_HOMME80 + 450);
      expect(result.basalSource).toBe('profile');
      expect(result.activitySource).toBe('healthConnectActive');
    });

    it('utilise les pas quand aucune calorie HC exploitable', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: { total: 0, active: 0 },
        healthSteps: 10_000,
        profile: homme80kg,
      });

      expect(result.basalKcal).toBe(BMR_HOMME80);
      expect(result.activityKcal).toBe(400);
      expect(result.totalKcal).toBe(BMR_HOMME80 + 400);
      expect(result.activitySource).toBe('steps');
      expect(result.activityIsEstimated).toBe(true);
    });

    it('retourne basal null quand le profil est incomplet, meme avec des pas', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: null,
        healthSteps: 10_000,
        profile: { ...homme80kg, sex: 'unspecified', weightKg: undefined },
      });

      expect(result.basalKcal).toBeNull();
      expect(result.activityKcal).toBe(350);
      expect(result.totalKcal).toBeNull();
      expect(result.basalSource).toBe('unknown');
      expect(result.activitySource).toBe('steps');
      expect(result.usedDefaultWeight).toBe(true);
    });

    it('utilise le repli habituel sans aucune donnee Health Connect', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: null,
        healthSteps: 0,
        profile: homme80kg,
      });

      expect(result.basalKcal).toBe(BMR_HOMME80);
      expect(result.activityKcal).toBe(356);
      expect(result.totalKcal).toBe(2136);
      expect(result.activitySource).toBe('habitualEstimate');
      expect(result.activityIsEstimated).toBe(true);
    });

    it('retourne tout a null quand profil incomplet et aucune donnee', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: null,
        healthSteps: null,
        profile: { ...homme80kg, sex: 'unspecified' },
      });

      expect(result.basalKcal).toBeNull();
      expect(result.activityKcal).toBeNull();
      expect(result.totalKcal).toBeNull();
      expect(result.basalSource).toBe('unknown');
      expect(result.activitySource).toBe('unknown');
      expect(frenchLabel(result.activitySourceLabelKey)).toBe('Dépense indisponible');
    });

    it('n emet aucun excedent quand la depense est inconnue', () => {
      expect(resolveDailyEnergyBalance(null, 135)).toEqual({ status: 'unavailable' });
    });

    // ---------- Nouveaux tests exiges ----------

    // T1: PAS DE DOUBLE COMPTAGE DE L'ACTIVITE
    it("T1 - ne compte pas l'activite deux fois (TDEE + active)", () => {
      const profile: EnergyProfile = {
        ...homme80kg,
        activityLevel: 'active',
      };
      const result = resolveDailyEnergyExpenditure({
        healthCalories: { total: 0, active: 50 },
        healthSteps: null,
        profile,
      });

      expect(result.basalKcal).toBe(BMR_HOMME80);
      expect(result.activityKcal).toBe(50);
      expect(result.totalKcal).toBe(BMR_HOMME80 + 50);
      expect(result.totalKcal).not.toBe(
        Math.round(BMR_HOMME80 * ACTIVITY_FACTORS.active) + 50
      );
    });

    // T2: PAS DE DOUBLE COMPTAGE DU METABOLISME
    it("T2 - isole l'activite du total HC sans double compte du metabolisme", () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: { total: 2000, active: 0 },
        healthSteps: null,
        profile: homme80kg,
      });

      expect(result.basalKcal).toBe(BMR_HOMME80);
      expect(result.activityKcal).toBe(2000 - BMR_HOMME80);
      expect(result.totalKcal).toBe(2000);
      expect(result.activitySource).toBe('healthConnectDerived');
    });

    // T3: total - BMR negatif
    it('T3 - plafonne a zero quand total HC est inferieur au BMR', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: { total: 1500, active: 0 },
        healthSteps: null,
        profile: homme80kg,
      });

      expect(result.basalKcal).toBe(BMR_HOMME80);
      expect(result.activityKcal).toBe(0);
      expect(result.totalKcal).toBe(BMR_HOMME80);
      expect(result.activitySource).toBe('healthConnectDerived');
    });

    // T4: Repli habituel
    it("T4 - repli sur le niveau d'activite declare sans donnees HC", () => {
      const profile: EnergyProfile = {
        ...homme80kg,
        activityLevel: 'moderate',
      };
      const result = resolveDailyEnergyExpenditure({
        healthCalories: null,
        healthSteps: null,
        profile,
      });

      expect(result.basalKcal).toBe(BMR_HOMME80);
      expect(result.activityKcal).toBe(Math.round(BMR_HOMME80 * 0.55));
      expect(result.totalKcal).toBe(BMR_HOMME80 + Math.round(BMR_HOMME80 * 0.55));
      expect(result.activitySource).toBe('habitualEstimate');
      expect(result.activityIsEstimated).toBe(true);
    });

    // T5: Profil incomplet
    it('T5 - profil incomplet : basal et total a null, pas de decomposition', () => {
      const result = resolveDailyEnergyExpenditure({
        healthCalories: null,
        healthSteps: null,
        profile: { ...homme80kg, sex: 'unspecified' },
      });

      expect(result.basalKcal).toBeNull();
      expect(result.activityKcal).toBeNull();
      expect(result.totalKcal).toBeNull();
      expect(result.basalSource).toBe('unknown');
      expect(result.activitySource).toBe('unknown');
      expect(result.activityIsEstimated).toBe(true);
    });

    // T6: Hierarchie des sources
    it('T6 - hierarchie : active > total > pas > repli habituel', () => {
      const profile: EnergyProfile = {
        ...homme80kg,
        activityLevel: 'moderate',
      };

      const r1 = resolveDailyEnergyExpenditure({
        healthCalories: { total: 9999, active: 50 },
        healthSteps: 50_000,
        profile,
      });
      expect(r1.activitySource).toBe('healthConnectActive');
      expect(r1.activityKcal).toBe(50);

      const r2 = resolveDailyEnergyExpenditure({
        healthCalories: { total: 2500, active: 0 },
        healthSteps: 50_000,
        profile,
      });
      expect(r2.activitySource).toBe('healthConnectDerived');

      const r3 = resolveDailyEnergyExpenditure({
        healthCalories: null,
        healthSteps: 10_000,
        profile,
      });
      expect(r3.activitySource).toBe('steps');

      const r4 = resolveDailyEnergyExpenditure({
        healthCalories: null,
        healthSteps: 0,
        profile,
      });
      expect(r4.activitySource).toBe('habitualEstimate');
    });

    // ---------- Verification des cles i18n ----------
    it('expose les cles i18n pour chaque source basale', () => {
      expect(BASAL_SOURCE_LABEL_KEYS.profile).toBe('nutrition.balance.basalProfile');
      expect(BASAL_SOURCE_LABEL_KEYS.unknown).toBe('nutrition.balance.sourceUnavailable');
    });

    it("expose les cles i18n pour chaque source d'activite", () => {
      expect(ACTIVITY_SOURCE_LABEL_KEYS.healthConnectActive).toBe(
        'nutrition.balance.activityHealthConnectActive'
      );
      expect(ACTIVITY_SOURCE_LABEL_KEYS.healthConnectDerived).toBe(
        'nutrition.balance.activityHealthConnectDerived'
      );
      expect(ACTIVITY_SOURCE_LABEL_KEYS.steps).toBe('nutrition.balance.activitySteps');
      expect(ACTIVITY_SOURCE_LABEL_KEYS.habitualEstimate).toBe(
        'nutrition.balance.activityHabitualEstimate'
      );
      expect(ACTIVITY_SOURCE_LABEL_KEYS.unknown).toBe('nutrition.balance.sourceUnavailable');
    });
  });

  describe('calculateBmr (Mifflin-St Jeor)', () => {
    it('homme 80 kg, 180 cm, 30 ans = 1780 kcal', () => {
      expect(calculateBmr(homme80kg)).toBe(1780);
    });

    it('femme 80 kg, 180 cm, 30 ans = 1614 kcal', () => {
      expect(calculateBmr({ ...homme80kg, sex: 'female' })).toBe(1614);
    });

    it('retourne null si le sexe est non precise', () => {
      expect(calculateBmr({ ...homme80kg, sex: 'unspecified' })).toBeNull();
    });

    it('retourne null si poids, taille ou age manquent ou sont invalides', () => {
      expect(calculateBmr({ ...homme80kg, weightKg: undefined })).toBeNull();
      expect(calculateBmr({ ...homme80kg, heightCm: undefined })).toBeNull();
      expect(calculateBmr({ ...homme80kg, ageYears: undefined })).toBeNull();
      expect(calculateBmr({ ...homme80kg, weightKg: 0 })).toBeNull();
      expect(calculateBmr({ ...homme80kg, heightCm: -10 })).toBeNull();
      expect(calculateBmr({ ...homme80kg, ageYears: 0 })).toBeNull();
    });
  });

  describe('calculateTdee', () => {
    it('applique le facteur sedentaire (1,2)', () => {
      expect(calculateTdee(homme80kg)).toBe(2136);
    });

    it('applique les facteurs leger, modere et actif', () => {
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

    it('signale le sexe non precise et le poids manquant', () => {
      expect(
        missingEnergyProfileFields({ sex: 'unspecified', heightCm: 180, ageYears: 30 }, undefined)
      ).toEqual(['sex', 'weight']);
    });

    it("signale la taille et l'age manquants", () => {
      expect(
        missingEnergyProfileFields({ sex: 'female', heightCm: undefined, ageYears: undefined }, 65)
      ).toEqual(['height', 'age']);
    });

    it("signale tous les champs dans l'ordre sexe, poids, taille, age", () => {
      expect(
        missingEnergyProfileFields({ sex: 'unspecified', heightCm: undefined, ageYears: undefined })
      ).toEqual(['sex', 'weight', 'height', 'age']);
    });

    it('traite les valeurs a 0 ou negatives comme manquantes', () => {
      expect(missingEnergyProfileFields({ sex: 'male', heightCm: 0, ageYears: -5 }, 0)).toEqual([
        'weight',
        'height',
        'age',
      ]);
    });
  });
});
