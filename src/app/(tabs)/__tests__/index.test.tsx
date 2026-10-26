import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Platform } from 'react-native';

import HomeScreen from '../index';
import { useActiveSessionStore } from '../../../store/activeSessionStore';
import { useBodyWeightStore } from '../../../store/bodyWeightStore';
import { useFoodDiaryStore } from '../../../store/foodDiaryStore';
import { useLanguageStore } from '../../../store/languageStore';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';
import { usePerformanceStore } from '../../../store/performanceStore';
import { useSessionStore } from '../../../store/sessionStore';
import { useDailyGoalsStore } from '../../../store/dailyGoalsStore';
import { DAILY_GOALS_WIDGET_SNAPSHOT_KEY } from '../../../lib/widgets/dailyGoalsWidgetSnapshot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { estimateActiveCaloriesFromSteps } from '../../../lib/energyBalance';
import {
  hasHealthPermissions,
  hasWeightPermission,
  isHealthConnectAvailable,
  readCaloriesBurnedToday,
  readLatestWeight,
  readStepsToday,
  requestHealthPermissionsWithStatus,
} from '../../../lib/healthConnect';

const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const React = jest.requireActual<any>('react');
  return {
    useRouter: () => ({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(),
    }),
    useFocusEffect: (effect: () => void) => {
      React.useEffect(effect, [effect]);
    },
  };
});

jest.mock('../../../lib/healthConnect', () => ({
  isHealthConnectAvailable: jest.fn(),
  // Parcours de connexion lance depuis un anneau « Connecter » de l'accueil.
  requestHealthPermissionsWithStatus: jest.fn(() => Promise.resolve({ status: 'available', granted: true })),
  openHealthConnectPlayStore: jest.fn(() => Promise.resolve()),
  openHealthConnectPermissionsForApp: jest.fn(() => Promise.resolve(true)),
  hasHealthPermissions: jest.fn(),
  readCaloriesBurnedToday: jest.fn(),
  readStepsToday: jest.fn(),
  // Permission optionnelle : par defaut refusee, l'ecran doit fonctionner
  // exactement pareil sans elle.
  hasWeightPermission: jest.fn().mockResolvedValue(false),
  readLatestWeight: jest.fn().mockResolvedValue(null),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual<any>('react');
  const { View } = jest.requireActual<any>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: any) => React.createElement(View, rest, children),
  };
});

const NOW = new Date('2026-08-14T12:00:00.000Z');

function resetStores() {
  useLanguageStore.setState({ language: 'fr' });
  usePerformanceStore.setState({
    sex: 'unspecified',
    age: undefined,
    heightCm: undefined,
    firstName: undefined,
    lastName: undefined,
  });
  useBodyWeightStore.setState({ entries: [] });
  useFoodDiaryStore.setState({ entries: [] });
  useNutritionGoalsStore.setState({
    goals: { dailyCalories: 2200, protein: 150, carbs: 200, fat: 65, goalType: 'maintenance' },
  });
  useSessionStore.setState({ sessions: [] });
  useActiveSessionStore.setState({ active: null });
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  mockPush.mockClear();
  (isHealthConnectAvailable as jest.Mock).mockResolvedValue(false);
  (hasHealthPermissions as jest.Mock).mockResolvedValue(false);
  (readCaloriesBurnedToday as jest.Mock).mockResolvedValue(null);
  (readStepsToday as jest.Mock).mockResolvedValue(null);
  (hasWeightPermission as jest.Mock).mockReset().mockResolvedValue(false);
  (requestHealthPermissionsWithStatus as jest.Mock).mockClear();
  (readLatestWeight as jest.Mock).mockReset().mockResolvedValue(null);
  resetStores();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('HomeScreen', () => {
  it('affiche le prénom de l’utilisateur quand il existe', () => {
    usePerformanceStore.setState({ firstName: 'Marc' });

    render(<HomeScreen />);

    expect(screen.getByText('Bonjour Marc')).toBeTruthy();
  });

  it('sans prénom, l’en-tête reste digne (pas de blanc parasite)', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Bonjour')).toBeTruthy();
    expect(screen.queryByText('Bonjour Marc')).toBeNull();
  });

  it("n'affiche aucune valeur de calories inventée quand la dépense est absente", () => {
    // Profil incomplet (sexe non renseigné, ni poids ni taille ni âge) :
    // resolveDailyEnergyExpenditure renvoie une dépense nulle (null).
    render(<HomeScreen />);

    // Le grand nombre « Restantes » et le poids (sans pesée)
    // affichent « — », pas un « 0 ».
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText('0 kcal dépensées')).toBeNull();
  });

  it("invite à compléter le profil quand la dépense estimée est indisponible", () => {
    render(<HomeScreen />);

    // Le sous-titre de la colonne « Restantes » remplace le tiret muet
    // par une invitation courte à compléter le profil.
    expect(screen.getByText('Complète ton profil')).toBeTruthy();

    // Le tiret seul ne figure plus à cet emplacement : il ne reste que le
    // grand nombre « Restantes » et le poids.
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('affiche « — » pour le poids quand aucune pesée n’est enregistrée', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Poids actuel')).toBeTruthy();
    expect(screen.getByTestId('home-weight-value').props.children).toBe('—');
  });

  it('affiche la dernière pesée sur l’accueil', () => {
    useBodyWeightStore.setState({
      entries: [{ id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 81.7 }],
    });

    render(<HomeScreen />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('81.7 kg')).toBeTruthy();
  });

  it('au premier rendu, les calories affichées sont inférieures à la valeur finale (le compteur monte)', () => {
    useFoodDiaryStore.setState({
      entries: [
        {
          id: 'f-1',
          date: '2026-08-14T08:00:00.000Z',
          mealType: 'breakfast',
          foodId: 'food-1',
          foodName: 'Test',
          quantity: 100,
          unit: 'g',
          calculatedNutrition: { calories: 500, protein: 0, carbs: 0, fat: 0 },
        },
      ],
    });

    render(<HomeScreen />);

    const calories = screen.getByTestId('home-calories-value');
    expect(Number(calories.props.children)).toBeLessThan(500);
  });

  it("pendant la montée, le poids ne montre jamais plus d'une décimale", () => {
    useBodyWeightStore.setState({
      entries: [{ id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 81.7 }],
    });

    render(<HomeScreen />);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const weight = screen.getByTestId('home-weight-value');
    const children = weight.props.children;
    const numericText = Array.isArray(children) ? String(children[0]) : String(children);

    expect(numericText).toMatch(/^-?\d+(\.\d)?$/);
  });

  it('affiche les pas et les calories brûlées estimées quand les pas sont disponibles', async () => {
    (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
    (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
    (readCaloriesBurnedToday as jest.Mock).mockResolvedValue(null);
    (readStepsToday as jest.Mock).mockResolvedValue(8000);

    useBodyWeightStore.setState({
      entries: [{ id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 81.7 }],
    });

    render(<HomeScreen />);
    await act(async () => {});

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const expectedCalories = estimateActiveCaloriesFromSteps(8000, 81.7).activeCaloriesKcal;

    expect(screen.getByText('8000 pas')).toBeTruthy();
    expect(screen.getByText(`${expectedCalories} kcal`)).toBeTruthy();
  });

  it("appui sur la bande poids → ouvre la vue « Poids » des stats", () => {
    render(<HomeScreen />);

    fireEvent.press(screen.getByTestId('home-weight-band'));

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/progress?tab=bodyWeight');
  });

  it("le bouton « Analyser un plat » pousse l’écran d’analyse photo à la racine", () => {
    render(<HomeScreen />);

    fireEvent.press(screen.getByLabelText('Analyser un plat'));

    expect(mockPush).toHaveBeenCalledWith('/meal-photo');
  });

  it("appui sur les pas → ouvre la vue « Pas » des stats", async () => {
    (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
    (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
    (readCaloriesBurnedToday as jest.Mock).mockResolvedValue(null);
    (readStepsToday as jest.Mock).mockResolvedValue(8000);

    useBodyWeightStore.setState({
      entries: [{ id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 81.7 }],
    });

    render(<HomeScreen />);
    await act(async () => {});

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    fireEvent.press(screen.getByTestId('home-steps-band'));

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/progress?tab=steps');
  });

  it("sans pas, la bande « Pas » n'existe pas", () => {
    render(<HomeScreen />);

    expect(screen.queryByTestId('home-steps-band')).toBeNull();
  });

  it("sans pas, le chevron est un descendant du groupe du poids", () => {
    render(<HomeScreen />);

    const weightGroup = screen.getByTestId('home-weight-group');
    expect(within(weightGroup).getByTestId('home-weight-chevron')).toBeTruthy();
  });

  it('verse le poids Health Connect dans l’historique des pesées', async () => {
    (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
    (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
    (readCaloriesBurnedToday as jest.Mock).mockResolvedValue(null);
    (readStepsToday as jest.Mock).mockResolvedValue(null);
    (hasWeightPermission as jest.Mock).mockResolvedValue(true);
    (readLatestWeight as jest.Mock).mockResolvedValue({
      weightKg: 78.4,
      time: '2026-08-27T07:12:00.000Z',
    });

    useBodyWeightStore.setState({ entries: [] });

    render(<HomeScreen />);
    await act(async () => {});

    expect(useBodyWeightStore.getState().entries).toHaveLength(1);
    expect(useBodyWeightStore.getState().entries[0]).toMatchObject({
      weight: 78.4,
      source: 'healthConnect',
    });
  });

  it('ne touche pas aux pesées quand la permission poids est refusée', async () => {
    (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
    (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
    (readCaloriesBurnedToday as jest.Mock).mockResolvedValue(null);
    (readStepsToday as jest.Mock).mockResolvedValue(8000);
    (hasWeightPermission as jest.Mock).mockResolvedValue(false);

    const manual = { id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 81.7 };
    useBodyWeightStore.setState({ entries: [manual] });

    render(<HomeScreen />);
    await act(async () => {});

    expect(readLatestWeight).not.toHaveBeenCalled();
    expect(useBodyWeightStore.getState().entries).toEqual([manual]);
  });

  it("sans donnée de pas, n'affiche aucun « 0 » ni valeur trompeuse à la place des pas et calories", async () => {
    (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
    (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
    (readCaloriesBurnedToday as jest.Mock).mockResolvedValue(null);
    (readStepsToday as jest.Mock).mockResolvedValue(null);

    render(<HomeScreen />);
    await act(async () => {});

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('0 pas')).toBeNull();
    expect(screen.queryByText('0 kcal')).toBeNull();
    expect(screen.queryByTestId('home-steps-value')).toBeNull();
    expect(screen.queryByTestId('home-steps-calories-value')).toBeNull();
  });

  describe('objectifs du jour', () => {
    it('sans Health Connect ni profil, les anneaux pas et dépense invitent au lieu d’afficher 0', () => {
      render(<HomeScreen />);

      expect(screen.getByText('Objectifs du jour')).toBeTruthy();
      expect(screen.getByTestId('home-goal-steps-unavailable').props.children).toBe('Connecter');
      expect(screen.getByTestId('home-goal-active-kcal-unavailable').props.children).toBe('Profil');
      // Zéro séance est une vraie valeur : l’anneau existe et affiche 0 / 3.
      expect(screen.getByTestId('home-goal-sessions-value').props.children).toBe('0');
      expect(screen.getByText('/ 3')).toBeTruthy();
      expect(screen.queryByTestId('home-goal-steps-value')).toBeNull();
    });

    it('affiche les pas du jour face à l’objectif et compte les séances de la semaine', async () => {
      (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
      (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
      (readCaloriesBurnedToday as jest.Mock).mockResolvedValue(null);
      (readStepsToday as jest.Mock).mockResolvedValue(6240);
      useDailyGoalsStore.setState({ stepsGoal: 8000, activeKcalGoal: 500 });
      usePerformanceStore.setState({ weeklySessionGoal: 3 });
      // NOW est le vendredi 14 août 2026 : lundi 10 et mercredi 12 sont dans la semaine,
      // le dimanche 9 n’y est pas.
      useSessionStore.setState({
        sessions: [
          { id: 's-1', date: '2026-08-12T18:00:00.000Z', durationSeconds: 1, exercises: [] },
          { id: 's-2', date: '2026-08-10T18:00:00.000Z', durationSeconds: 1, exercises: [] },
          { id: 's-3', date: '2026-08-09T18:00:00.000Z', durationSeconds: 1, exercises: [] },
        ],
      });

      render(<HomeScreen />);
      await act(async () => {});

      expect(screen.getByTestId('home-goal-steps-value').props.children).toMatch(/^6.240$/);
      expect(screen.getByTestId('home-goal-sessions-value').props.children).toBe('2');
      expect(screen.getByText('/ 3')).toBeTruthy();
    });

    it('la dépense « habituelle » du profil ne compte pas comme progression', async () => {
      // Profil complet mais ni pas ni séance : la dépense d’activité est un
      // repli constant tiré du niveau d’activité, pas une donnée du jour.
      usePerformanceStore.setState({ sex: 'male', age: 30, heightCm: 180, activityLevel: 'moderate' });
      useBodyWeightStore.setState({
        entries: [{ id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 80 }],
      });

      render(<HomeScreen />);
      await act(async () => {});

      // Le profil est complet : c’est la donnée qui manque, pas le profil.
      expect(screen.getByTestId('home-goal-active-kcal-unavailable').props.children).toBe('Connecter');
      expect(screen.queryByTestId('home-goal-active-kcal-value')).toBeNull();
    });

    it('avec des donnees, les anneaux et « Régler » mènent aux bons écrans', async () => {
      (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
      (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
      (readCaloriesBurnedToday as jest.Mock).mockResolvedValue({ active: 300, total: null });
      (readStepsToday as jest.Mock).mockResolvedValue(6240);
      usePerformanceStore.setState({ sex: 'male', age: 30, heightCm: 180 });
      useBodyWeightStore.setState({
        entries: [{ id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 80 }],
      });

      render(<HomeScreen />);
      await act(async () => {});

      fireEvent.press(screen.getByTestId('home-goal-steps'));
      expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/progress?tab=steps');
      fireEvent.press(screen.getByTestId('home-goal-sessions'));
      expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/progress?tab=sessions');
      fireEvent.press(screen.getByTestId('home-goal-active-kcal'));
      expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/progress?tab=energy');
      fireEvent.press(screen.getByTestId('home-daily-goals-adjust'));
      expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/settings');
      expect(requestHealthPermissionsWithStatus).not.toHaveBeenCalled();
    });

    it('un anneau « Connecter » lance la demande Health Connect puis relit le jour', async () => {
      // Sans permission au depart ; accordee au premier appui.
      (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
      (hasHealthPermissions as jest.Mock).mockResolvedValueOnce(false).mockResolvedValue(true);
      (readStepsToday as jest.Mock).mockResolvedValue(6240);
      (readCaloriesBurnedToday as jest.Mock).mockResolvedValue(null);

      render(<HomeScreen />);
      await act(async () => {});
      expect(screen.getByTestId('home-goal-steps-unavailable')).toBeTruthy();

      await act(async () => {
        fireEvent.press(screen.getByTestId('home-goal-steps'));
      });

      expect(requestHealthPermissionsWithStatus).toHaveBeenCalledTimes(1);
      // Aucun detour par un historique vide.
      expect(mockPush).not.toHaveBeenCalledWith('/(tabs)/progress?tab=steps');
      // Le jour est relu : les pas remplacent « Connecter ».
      expect(screen.getByTestId('home-goal-steps-value').props.children).toMatch(/^6.240$/);
    });

    it("l'anneau dépense « Connecter » (profil complet, aucune donnee) lance aussi la connexion", async () => {
      usePerformanceStore.setState({ sex: 'male', age: 30, heightCm: 180, activityLevel: 'moderate' });
      useBodyWeightStore.setState({
        entries: [{ id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 80 }],
      });

      render(<HomeScreen />);
      await act(async () => {});
      expect(screen.getByTestId('home-goal-active-kcal-unavailable').props.children).toBe('Connecter');

      await act(async () => {
        fireEvent.press(screen.getByTestId('home-goal-active-kcal'));
      });

      expect(requestHealthPermissionsWithStatus).toHaveBeenCalledTimes(1);
    });

    it('Health Connect connecte sans activite encore : la depense vaut 0, pas « Connecter »', async () => {
      (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
      (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
      (readStepsToday as jest.Mock).mockResolvedValue(0);
      (readCaloriesBurnedToday as jest.Mock).mockResolvedValue(null);
      usePerformanceStore.setState({ sex: 'male', age: 30, heightCm: 180, activityLevel: 'moderate' });
      useBodyWeightStore.setState({
        entries: [{ id: 'w-1', date: '2026-08-14T12:00:00.000Z', weight: 80 }],
      });

      render(<HomeScreen />);
      await act(async () => {});

      expect(screen.getByTestId('home-goal-steps-value').props.children).toBe('0');
      expect(screen.getByTestId('home-goal-active-kcal-value').props.children).toBe('0');
      expect(screen.queryByTestId('home-goal-active-kcal-unavailable')).toBeNull();
    });

    it("l'anneau dépense « Profil » mene au profil, sans demande Health Connect", () => {
      render(<HomeScreen />);
      expect(screen.getByTestId('home-goal-active-kcal-unavailable').props.children).toBe('Profil');

      fireEvent.press(screen.getByTestId('home-goal-active-kcal'));

      expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/profile');
      expect(requestHealthPermissionsWithStatus).not.toHaveBeenCalled();
    });

    it('publie le même instantané vers le widget Android', async () => {
      // jest-expo simule iOS par défaut ; le widget n’existe que sur Android.
      const platform = Platform.OS;
      Platform.OS = 'android';
      (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
      (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
      (readCaloriesBurnedToday as jest.Mock).mockResolvedValue(null);
      (readStepsToday as jest.Mock).mockResolvedValue(6240);
      useDailyGoalsStore.setState({ stepsGoal: 8000, activeKcalGoal: 500 });

      render(<HomeScreen />);
      await act(async () => {});

      const stored = JSON.parse((await AsyncStorage.getItem(DAILY_GOALS_WIDGET_SNAPSHOT_KEY)) ?? 'null');
      expect(stored.snapshot.steps).toMatchObject({ kind: 'progress', value: 6240, goal: 8000 });
      expect(stored.labels.title).toBe('Objectifs du jour');
      expect(stored.labels).toMatchObject({ steps: 'Pas', sessions: 'Séances', activeKcal: 'kcal' });
      expect(requestWidgetUpdate).toHaveBeenCalledWith(expect.objectContaining({ widgetName: 'DailyGoals' }));
      Platform.OS = platform;
    });
  });
});
