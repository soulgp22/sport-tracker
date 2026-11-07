import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_FONT, FONT_THEMES } from '../../theme/fonts';
import { DEFAULT_PALETTE, PALETTES } from '../../theme/palettes';
import { useThemeStore } from '../themeStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  useThemeStore.setState({ paletteId: DEFAULT_PALETTE, fontId: DEFAULT_FONT });
});

// Récupère la fonction merge du middleware persist pour la tester directement,
// sans dépendre du cycle d'hydratation de zustand (même motif que le test du
// onboardingStore).
type MergeFn = (persisted: unknown, current: unknown) => unknown;

function getMergeFn(): MergeFn {
  const options = useThemeStore.persist.getOptions();
  return options.merge as MergeFn;
}

const currentState = { paletteId: DEFAULT_PALETTE, fontId: DEFAULT_FONT };

describe('themeStore', () => {
  it("expose par défaut l'identité unique (DEFAULT_PALETTE et DEFAULT_FONT)", () => {
    const initialState = useThemeStore.getInitialState();
    expect(initialState.paletteId).toBe(DEFAULT_PALETTE);
    expect(initialState.fontId).toBe(DEFAULT_FONT);
  });

  it("persiste dans AsyncStorage sous la clé 'theme-store' après un changement", async () => {
    useThemeStore.getState().setPalette(DEFAULT_PALETTE);

    // Attendre l'écriture asynchrone du middleware persist
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stored = await AsyncStorage.getItem('theme-store');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.paletteId).toBe(DEFAULT_PALETTE);
    expect(parsed.state.fontId).toBe(DEFAULT_FONT);
  });

  it('T1 — rehydrate un ancien identifiant invalide vers la valeur par défaut', async () => {
    // Un vrai utilisateur a pu persister un identifiant de l'ancienne gamme.
    await AsyncStorage.setItem(
      'theme-store',
      JSON.stringify({
        state: { paletteId: 'oxford', fontId: 'performance' },
        version: 0,
      }),
    );

    await useThemeStore.persist.rehydrate();

    const state = useThemeStore.getState();

    // Le merge de validation ramène tout identifiant inconnu vers la valeur par
    // défaut, qui existe toujours dans les registres.
    expect(state.paletteId).toBe(DEFAULT_PALETTE);
    expect(state.fontId).toBe(DEFAULT_FONT);
    expect(PALETTES[state.paletteId]).toBeDefined();
    expect(FONT_THEMES[state.fontId]).toBeDefined();
  });

  it('T2 — merge ne lève jamais et retombe sur les valeurs par défaut pour des entrées malformées', () => {
    const mergeFn = getMergeFn();

    const corruptCases: { label: string; value: unknown }[] = [
      { label: 'undefined', value: undefined },
      { label: 'null', value: null },
      { label: 'nombre (42)', value: 42 },
      { label: 'chaîne ("abc")', value: 'abc' },
      { label: 'objet vide', value: {} },
      { label: '{ paletteId: 42, fontId: null }', value: { paletteId: 42, fontId: null } },
      { label: '{ paletteId: {}, fontId: "" }', value: { paletteId: {}, fontId: '' } },
    ];

    for (const scenario of corruptCases) {
      // Si merge lève, l'appel direct fait échouer le test.
      const merged = mergeFn(scenario.value, currentState) as {
        paletteId: unknown;
        fontId: unknown;
      };

      expect(merged.paletteId).toBe(DEFAULT_PALETTE);
      expect(merged.fontId).toBe(DEFAULT_FONT);
    }
  });

  it('T3 — conserve un identifiant valide déjà persisté', async () => {
    await AsyncStorage.setItem(
      'theme-store',
      JSON.stringify({
        state: { paletteId: DEFAULT_PALETTE, fontId: DEFAULT_FONT },
        version: 0,
      }),
    );

    await useThemeStore.persist.rehydrate();

    const state = useThemeStore.getState();
    expect(state.paletteId).toBe(DEFAULT_PALETTE);
    expect(state.fontId).toBe(DEFAULT_FONT);
  });
});

describe('changement de police', () => {
  // Import tardif : `fonts` lit la police active posée par le store.
  const { fonts } = jest.requireActual('../../theme/fonts') as typeof import('../../theme/fonts');

  afterEach(() => {
    useThemeStore.getState().setFont(DEFAULT_FONT);
  });

  it('T4 — setFont change aussitôt les jetons lus par les feuilles de style', () => {
    useThemeStore.getState().setFont('classique');
    expect(fonts.serifBold).toBe(FONT_THEMES.classique.tokens.serifBold);
    expect(fonts.sans).toBe(FONT_THEMES.classique.tokens.sans);
  });

  it('T5 — une police persistée est active dès la réhydratation, avant tout rendu', async () => {
    await AsyncStorage.setItem(
      'theme-store',
      JSON.stringify({ state: { paletteId: 'nuit', fontId: 'lisible' }, version: 0 })
    );
    await useThemeStore.persist.rehydrate();
    expect(useThemeStore.getState().paletteId).toBe('nuit');
    expect(fonts.sans).toBe(FONT_THEMES.lisible.tokens.sans);
  });
});
