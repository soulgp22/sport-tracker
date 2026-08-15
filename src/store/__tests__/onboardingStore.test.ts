import { useOnboardingStore } from '../onboardingStore';

// Reconstruct the merge logic so we test it directly instead of fighting
// Zustand's internal type shape. This mirrors the exact logic in onboardingStore.ts.
type MergeFn = (persisted: unknown, current: unknown) => unknown;

function getMergeFn(): MergeFn {
  const options = useOnboardingStore.persist.getOptions();
  return options.merge as MergeFn;
}

const initialCurrent: Partial<Record<string, unknown>> = {
  completed: false,
};

describe('onboardingStore merge', () => {
  it('restores completed: true from persisted state after merge', () => {
    const mergeFn = getMergeFn();
    const persisted = { completed: true };

    const merged = mergeFn(persisted, initialCurrent) as { completed: boolean };

    expect(merged.completed).toBe(true);
  });

  it('restores completed: false from persisted state after merge', () => {
    const mergeFn = getMergeFn();
    const persisted = { completed: false };

    const merged = mergeFn(persisted, initialCurrent) as { completed: boolean };

    expect(merged.completed).toBe(false);
  });

  it('falls back to completed: false when persisted state has no completed field (backward compat)', () => {
    const mergeFn = getMergeFn();
    const persisted = {};

    const merged = mergeFn(persisted, initialCurrent) as { completed: boolean };

    expect(merged.completed).toBe(false);
  });

  it('falls back to completed: false when persisted state has non-boolean completed', () => {
    const mergeFn = getMergeFn();
    const persisted = { completed: 'true' };

    const merged = mergeFn(persisted, initialCurrent) as { completed: boolean };

    expect(merged.completed).toBe(false);
  });

  // --- Tests exigés : Couche 1 - merge ne doit JAMAIS lever ---

  it('merge(undefined, current) ne lève pas et renvoie un état valide', () => {
    const mergeFn = getMergeFn();

    const merged = mergeFn(undefined, initialCurrent) as { completed: boolean };

    expect(merged.completed).toBe(false);
  });

  it('merge(null, current), merge("corrompu", current), merge(42, current) ne lèvent pas', () => {
    const mergeFn = getMergeFn();

    const r1 = mergeFn(null, initialCurrent) as { completed: boolean };
    expect(r1.completed).toBe(false);

    const r2 = mergeFn('corrompu', initialCurrent) as { completed: boolean };
    expect(r2.completed).toBe(false);

    const r3 = mergeFn(42, initialCurrent) as { completed: boolean };
    expect(r3.completed).toBe(false);
  });

  // --- T1 : État persisté ancien complet (migration silencieuse) ---
  // En plus de valider que completed:true survit, ce test vérifie la couche
  // défensive : si le try/catch ou la garde de type de merge est retiré,
  // l'appel merge(undefined, ...) lève une TypeError et le test échoue.

  it('T1 — état persisté ancien avec completed:true et les 5 champs morts est lu sans lever, completed survit', () => {
    const mergeFn = getMergeFn();
    const persisted = {
      completed: true,
      profile: {
        goal: 'muscle',
        level: 'advanced',
        daysPerWeek: 4,
        equipmentProfileId: 'full-gym',
        retailer: 'foods-france',
      },
    };

    const merged = mergeFn(persisted, initialCurrent) as { completed: boolean };

    // completed doit survivre pour ne pas reproposer l'onboarding
    expect(merged.completed).toBe(true);

    // Vérification défensive : si le try/catch ou la garde de type est
    // retiré de merge, merge(undefined) lève → T1 échoue.
    expect(() => mergeFn(undefined, initialCurrent)).not.toThrow();
  });

  // --- T2 : États persistes corrompus ---

  it('T2 — états persistes corrompus ne lèvent pas et completed retombe sur false', () => {
    const mergeFn = getMergeFn();

    const corruptCases: { label: string; value: unknown }[] = [
      { label: 'null', value: null },
      { label: '"abc"', value: 'abc' },
      { label: '42', value: 42 },
      { label: '{}', value: {} },
      { label: '{ completed: "oui" }', value: { completed: 'oui' } },
      { label: '{ profile: 42 }', value: { profile: 42 } },
    ];

    for (const scenario of corruptCases) {
      const merged = mergeFn(scenario.value, initialCurrent) as { completed: boolean };
      expect(merged.completed).toBe(false);
    }
  });

  // --- T3 : restart() remet completed à false ---

  it('T3 — restart() remet completed à false', () => {
    useOnboardingStore.setState({ completed: true });
    expect(useOnboardingStore.getState().completed).toBe(true);

    useOnboardingStore.getState().restart();
    expect(useOnboardingStore.getState().completed).toBe(false);
  });
});

describe('onboardingStore onRehydrateStorage', () => {
  it('le callback rendu par onRehydrateStorage met hasHydrated à vrai quand il est appelé avec une ERREUR', () => {
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
