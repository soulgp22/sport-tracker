import { useOnboardingStore, type OnboardingProfile } from '../onboardingStore';

// Reconstruct the merge logic so we test it directly instead of fighting
// Zustand's internal type shape. This mirrors the exact logic in onboardingStore.ts.
type MergeFn = (persisted: unknown, current: unknown) => unknown;

function getMergeFn(): MergeFn {
  const options = useOnboardingStore.persist.getOptions();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return options.merge as MergeFn;
}

const initialProfile: OnboardingProfile = {
  goal: 'fitness',
  level: 'beginner',
  daysPerWeek: 3,
  equipmentProfileId: 'full-gym',
  retailer: 'none',
};

const initialCurrent: Partial<Record<string, unknown>> = {
  completed: false,
  profile: initialProfile,
};

// Un profil valide complet utilisable dans les tests de non-régression et de merge normal
const validProfile: OnboardingProfile = {
  goal: 'muscle',
  level: 'advanced',
  daysPerWeek: 5,
  equipmentProfileId: 'barbell',
  retailer: 'decathlon',
};

describe('onboardingStore merge', () => {
  it('restores completed: true from persisted state after merge', () => {
    const mergeFn = getMergeFn();
    const persisted = { completed: true, profile: initialProfile };

    const merged = mergeFn(persisted, initialCurrent) as { completed: boolean; profile: OnboardingProfile };

    expect(merged.completed).toBe(true);
  });

  it('restores completed: false from persisted state after merge', () => {
    const mergeFn = getMergeFn();
    const persisted = { completed: false, profile: initialProfile };

    const merged = mergeFn(persisted, initialCurrent) as { completed: boolean };

    expect(merged.completed).toBe(false);
  });

  it('falls back to completed: false when persisted state has no completed field (backward compat)', () => {
    const mergeFn = getMergeFn();
    // Simulate an older persisted state without the completed key
    const persisted = { profile: initialProfile };

    const merged = mergeFn(persisted, initialCurrent) as { completed: boolean };

    expect(merged.completed).toBe(false);
  });

  it('falls back to completed: false when persisted state has non-boolean completed', () => {
    const mergeFn = getMergeFn();
    const persisted = { completed: 'true', profile: initialProfile };

    const merged = mergeFn(persisted, initialCurrent) as { completed: boolean };

    expect(merged.completed).toBe(false);
  });

  // --- Tests exiges : Couche 1 - merge ne doit JAMAIS lever ---

  it('merge(undefined, current) ne leve pas et renvoie un état valide', () => {
    const mergeFn = getMergeFn();

    const merged = mergeFn(undefined, initialCurrent) as {
      completed: boolean;
      profile: OnboardingProfile;
    };

    expect(merged.completed).toBe(false);
    expect(merged.profile).toEqual(initialProfile);
  });

  it('merge(null, current), merge("corrompu", current), merge(42, current) ne levent pas', () => {
    const mergeFn = getMergeFn();

    const r1 = mergeFn(null, initialCurrent) as {
      completed: boolean;
      profile: OnboardingProfile;
    };
    expect(r1.completed).toBe(false);
    expect(r1.profile).toEqual(initialProfile);

    const r2 = mergeFn('corrompu', initialCurrent) as {
      completed: boolean;
      profile: OnboardingProfile;
    };
    expect(r2.completed).toBe(false);
    expect(r2.profile).toEqual(initialProfile);

    const r3 = mergeFn(42, initialCurrent) as {
      completed: boolean;
      profile: OnboardingProfile;
    };
    expect(r3.completed).toBe(false);
    expect(r3.profile).toEqual(initialProfile);
  });

  it('merge({ profile: null }, current) et merge({ profile: "x" }, current) : aucune exception, profil initial', () => {
    const mergeFn = getMergeFn();

    const r1 = mergeFn({ profile: null }, initialCurrent) as {
      completed: boolean;
      profile: OnboardingProfile;
    };
    expect(r1.completed).toBe(false);
    expect(r1.profile).toEqual(initialProfile);

    const r2 = mergeFn({ profile: 'x' }, initialCurrent) as {
      completed: boolean;
      profile: OnboardingProfile;
    };
    expect(r2.completed).toBe(false);
    expect(r2.profile).toEqual(initialProfile);
  });

  it('merge avec des champs de profil invalides : les champs invalides retombent sur les valeurs initiales', () => {
    const mergeFn = getMergeFn();
    const persisted = {
      profile: {
        goal: 'invalide' as string,
        level: 'ultra' as string,
        daysPerWeek: 'trois',
        equipmentProfileId: 'unknown' as string,
        retailer: 'nimporte',
      },
    };

    const merged = mergeFn(persisted, initialCurrent) as {
      completed: boolean;
      profile: OnboardingProfile;
    };

    expect(merged.completed).toBe(false);
    // Tous les champs invalides doivent retomber sur les valeurs initiales
    expect(merged.profile.goal).toBe('fitness');
    expect(merged.profile.level).toBe('beginner');
    expect(merged.profile.daysPerWeek).toBe(3);
    expect(merged.profile.equipmentProfileId).toBe('full-gym');
    // retailer est une string quelconque, donc 'nimporte' est accepté
    expect(merged.profile.retailer).toBe('nimporte');
  });

  // --- Tests de non-regression ---

  it('NON-REGRESSION : merge avec completed:true et profil valide renvoie completed:true et le profil sauvegardé', () => {
    const mergeFn = getMergeFn();
    const persisted = {
      completed: true,
      profile: validProfile,
    };

    const merged = mergeFn(persisted, initialCurrent) as {
      completed: boolean;
      profile: OnboardingProfile;
    };

    expect(merged.completed).toBe(true);
    expect(merged.profile.goal).toBe('muscle');
    expect(merged.profile.level).toBe('advanced');
    expect(merged.profile.daysPerWeek).toBe(5);
    expect(merged.profile.equipmentProfileId).toBe('barbell');
    expect(merged.profile.retailer).toBe('decathlon');
  });

  it('NON-REGRESSION : la migration du champ historique gym fonctionne toujours', () => {
    const mergeFn = getMergeFn();

    // Cas 1 : gym='home' doit migrer vers 'bodyweight'
    const r1 = mergeFn(
      { profile: { gym: 'home' } },
      initialCurrent,
    ) as { profile: OnboardingProfile };
    expect(r1.profile.equipmentProfileId).toBe('bodyweight');

    // Cas 2 : gym='commercial' doit migrer vers 'full-gym'
    const r2 = mergeFn(
      { profile: { gym: 'commercial' } },
      initialCurrent,
    ) as { profile: OnboardingProfile };
    expect(r2.profile.equipmentProfileId).toBe('full-gym');

    // Cas 3 : gym est prioritaire sur equipmentProfileId quand les deux existent
    const r3 = mergeFn(
      { profile: { gym: 'home', equipmentProfileId: 'barbell' } },
      initialCurrent,
    ) as { profile: OnboardingProfile };
    expect(r3.profile.equipmentProfileId).toBe('bodyweight');

    // Cas 4 : gym absent mais equipmentProfileId présent : on utilise equipmentProfileId
    const r4 = mergeFn(
      { profile: { equipmentProfileId: 'dumbbells' } },
      initialCurrent,
    ) as { profile: OnboardingProfile };
    expect(r4.profile.equipmentProfileId).toBe('dumbbells');
  });
});

describe('onboardingStore onRehydrateStorage', () => {
  it('le callback rendu par onRehydrateStorage met hasHydrated a vrai quand il est appele avec une ERREUR', () => {
    const options = useOnboardingStore.persist.getOptions();
    const onRehydrateStorage = options.onRehydrateStorage as
      | ((state: unknown) => ((state?: unknown, error?: unknown) => void) | void)
      | undefined;

    expect(onRehydrateStorage).toBeDefined();

    // Réinitialiser hasHydrated pour le test
    useOnboardingStore.setState({ hasHydrated: false });

    // Obtenir le callback post-hydratation en appelant onRehydrateStorage
    const postCallback = onRehydrateStorage!(useOnboardingStore.getState());

    // La fonction doit retourner un callback
    expect(postCallback).toBeDefined();

    // Simuler un échec d'hydratation : appeler le callback avec (undefined, error)
    postCallback!(undefined, new Error('simulated hydration failure'));

    // Vérifier que hasHydrated est passé à true malgré l'erreur
    expect(useOnboardingStore.getState().hasHydrated).toBe(true);
  });
});
