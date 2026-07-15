import AsyncStorage from '@react-native-async-storage/async-storage';

import { useThemeStore } from '../themeStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  useThemeStore.setState({ paletteId: 'oxford' });
});

describe('themeStore', () => {
  it("paletteId par défaut = 'oxford'", () => {
    expect(useThemeStore.getState().paletteId).toBe('oxford');
  });

  it("setPalette('ecurie') puis setPalette('regiment') met bien à jour paletteId", () => {
    useThemeStore.getState().setPalette('ecurie');
    expect(useThemeStore.getState().paletteId).toBe('ecurie');

    useThemeStore.getState().setPalette('regiment');
    expect(useThemeStore.getState().paletteId).toBe('regiment');
  });

  it("persiste dans AsyncStorage sous la clé 'theme-store' après un changement", async () => {
    useThemeStore.getState().setPalette('ecurie');

    // Attendre l'écriture asynchrone du middleware persist
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stored = await AsyncStorage.getItem('theme-store');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.paletteId).toBe('ecurie');
  });
});
