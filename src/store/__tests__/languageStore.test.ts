import AsyncStorage from '@react-native-async-storage/async-storage';

import { translate } from '../../i18n/translations';
import { useLanguageStore } from '../languageStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  useLanguageStore.setState({ language: 'fr' });
});

afterEach(() => {
  useLanguageStore.setState({ language: 'fr' });
});

describe('languageStore', () => {
  it('uses French by default and switches language immediately', () => {
    expect(useLanguageStore.getState().language).toBe('fr');

    useLanguageStore.getState().setLanguage('de');

    expect(useLanguageStore.getState().language).toBe('de');
    expect(translate('de', 'nav.exercises')).toBe('Übungen');
  });

  it('persists the selected language', async () => {
    useLanguageStore.getState().setLanguage('es');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stored = await AsyncStorage.getItem('language-store');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).state.language).toBe('es');
  });
});
