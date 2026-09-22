/**
 * Onglets « Dépense » (A01) et « Pas » (A02) de l'ecran Historique.
 *
 * Verifie la PRESENTATION : les calculs sont couverts par
 * `lib/__tests__/energyHistory.test.ts` et `energyBreakdown.test.ts`.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import HistoryScreen from '../index';
import { useSessionStore } from '../../../../store/sessionStore';
import { useBodyWeightStore } from '../../../../store/bodyWeightStore';
import { usePerformanceStore } from '../../../../store/performanceStore';
import { useLanguageStore } from '../../../../store/languageStore';
import {
  hasHealthPermissions,
  isHealthConnectAvailable,
  readDailyHealthHistory,
} from '../../../../lib/healthConnect';
import { localDayKey } from '../../../../lib/dateKeys';

jest.mock('expo-router', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useFocusEffect: (effect: () => void) => ReactLocal.useEffect(effect, [effect]),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactLocal.createElement(View, rest, children),
  };
});

jest.mock('../../../../lib/healthConnect', () => ({
  isHealthConnectAvailable: jest.fn(),
  hasHealthPermissions: jest.fn(),
  readDailyHealthHistory: jest.fn(),
}));

const TODAY = localDayKey(new Date());

function completeProfile() {
  usePerformanceStore.setState({ sex: 'male', heightCm: 180, age: 30, activityLevel: 'sedentary' });
  useBodyWeightStore.setState({
    entries: [{ id: 'w', date: new Date().toISOString(), weight: 80, source: 'manual' }],
  });
}

beforeEach(() => {
  useLanguageStore.setState({ language: 'fr' });
  useSessionStore.setState({ sessions: [] });
  (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
  (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
  (readDailyHealthHistory as jest.Mock).mockResolvedValue(
    new Map([[TODAY, { steps: 9000, activeKcal: null, totalKcal: null }]])
  );
});

async function openTab(value: 'energy' | 'steps') {
  render(<HistoryScreen />);
  await act(async () => {});
  fireEvent.press(screen.getByTestId(`history-tabs-${value}`));
}

describe('Historique — onglet Dépense', () => {
  it('affiche la depense du jour repartie par source', async () => {
    completeProfile();
    await openTab('energy');

    expect(screen.getAllByTestId('energy-row').length).toBeGreaterThan(0);
    // Une seule ligne de detail : corps puis pas, dans cet ordre. RNTL
    // normalise les espaces multiples : d'ou « + » autour du point median.
    expect(screen.getByText(/^Corps [\d\s  ]+ +· +Pas [\d\s  ]+$/)).toBeTruthy();
  });

  it('invite a completer le profil quand la depense est incalculable', async () => {
    usePerformanceStore.setState({ sex: 'unspecified', heightCm: undefined, age: undefined });
    useBodyWeightStore.setState({ entries: [] });
    await openTab('energy');

    expect(screen.getByText('Dépense indisponible')).toBeTruthy();
    expect(screen.getByText('Compléter mon profil')).toBeTruthy();
  });

  it('bascule entre jour, mois et annee', async () => {
    completeProfile();
    await openTab('energy');

    fireEvent.press(screen.getByTestId('history-granularity-year'));
    expect(screen.getByText(String(new Date().getFullYear()))).toBeTruthy();
  });
});

describe('Historique — onglet Pas', () => {
  it('affiche les pas et les calories liees', async () => {
    completeProfile();
    await openTab('steps');

    expect(screen.getAllByTestId('steps-row').length).toBeGreaterThan(0);
    expect(screen.getByText(/9[\s  ]?000 pas/)).toBeTruthy();
    expect(screen.getByText(/kcal liées aux pas/)).toBeTruthy();
  });

  it('rappelle la limite de profondeur de Health Connect', async () => {
    completeProfile();
    await openTab('steps');

    expect(screen.getByText(/30 jours précédant ta première autorisation/)).toBeTruthy();
  });

  it('propose de connecter Health Connect quand aucun pas n’existe', async () => {
    completeProfile();
    (readDailyHealthHistory as jest.Mock).mockResolvedValue(new Map());
    await openTab('steps');

    expect(screen.getByText('Aucun pas enregistré')).toBeTruthy();
    expect(screen.getByText('Aller à Nutrition')).toBeTruthy();
  });
});

describe('Historique — onglet Séances', () => {
  it('reste l’onglet par defaut, inchange', async () => {
    render(<HistoryScreen />);
    await act(async () => {});
    expect(screen.queryByTestId('energy-row')).toBeNull();
    expect(screen.queryByTestId('steps-row')).toBeNull();
  });
});
