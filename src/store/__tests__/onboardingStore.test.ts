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

describe('onboardingStore merge', () => {
  it('restores completed: true from persisted state after merge', () => {
    const mergeFn = getMergeFn();
    const persisted = { completed: true, profile: initialProfile };

    const merged = mergeFn(persisted, initialCurrent) as { completed: boolean };

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
});
