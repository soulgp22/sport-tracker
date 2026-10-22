import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import ActiveSessionScreen from '../active';
import { appAlert } from '../../../../components/ui/AppDialog';
import { useActiveSessionStore } from '../../../../store/activeSessionStore';
import { useBodyWeightStore } from '../../../../store/bodyWeightStore';
import { useLanguageStore } from '../../../../store/languageStore';
import { usePerformanceStore } from '../../../../store/performanceStore';
import { useSessionStore } from '../../../../store/sessionStore';
import { maybeRequestStoreReview } from '../../../../lib/storeReview';
import type { ActiveSession, Session } from '../../../../types';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: jest.fn(),
  }),
  useNavigation: () => ({
    getParent: () => ({ setOptions: mockSetOptions }),
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual<any>('react');
  const { View } = jest.requireActual<any>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: any) => React.createElement(View, rest, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// expo-image est un composant natif : on le remplace pour ne jamais déclencher
// un vrai téléchargement pendant le test.
jest.mock('expo-image', () => {
  const React = jest.requireActual<any>('react');
  const { View } = jest.requireActual<any>('react-native');
  return {
    Image: (props: any) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

jest.mock('../../../../components/ui/AppDialog', () => ({
  appAlert: jest.fn(),
}));

jest.mock('../../../../lib/storeReview', () => ({
  ...jest.requireActual('../../../../lib/storeReview'),
  maybeRequestStoreReview: jest.fn(() => Promise.resolve(false)),
}));

// Le détail d'exercice importe exerciseModels (require() sur des .glb) et le
// viewer 3D DOM. Ce test ne couvre pas cette branche : on l'isole.
jest.mock('../../../../components/exercises/ExerciseDetailView', () => ({
  ExerciseDetailView: () => null,
}));

function makeActiveSession(): ActiveSession {
  return {
    id: 's1',
    programId: 'p1',
    programDayId: 'd1',
    programName: 'Push',
    dayName: 'Jour 1',
    startedAt: '2026-01-01T10:00:00.000Z',
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    exercises: [
      {
        exerciseId: 'exercise-zzz-000',
        exerciseName: 'Test Exercise',
        sets: [
          {
            targetReps: 10,
            targetWeight: 60,
            targetRestSeconds: 90,
            actualReps: 10,
            actualWeight: 60,
            completed: false,
          },
        ],
      },
    ],
    restTimerActive: false,
    restEndsAt: null,
    restTimerMinimized: false,
  };
}

function resetStores() {
  useLanguageStore.setState({ language: 'fr' });
  useActiveSessionStore.setState({ active: null });
  useSessionStore.setState({ sessions: [] });
  useBodyWeightStore.setState({ entries: [] });
  usePerformanceStore.setState({
    sex: 'unspecified',
    age: undefined,
    heightCm: undefined,
    activityLevel: 'sedentary',
    experience: 'beginner',
    weeklySessionGoal: 3,
    monthlySessionGoal: 12,
    notificationsEnabled: false,
    programDescription: '',
    firstName: undefined,
    lastName: undefined,
    unlockedBadges: [],
  });
}

function makePastSession(id: string): Session {
  return {
    id,
    date: '2025-12-20T10:00:00.000Z',
    durationSeconds: 1800,
    exercises: [],
  };
}

function confirmFinish() {
  fireEvent.press(screen.getByText('Terminer'));
  const buttons = (appAlert as unknown as jest.Mock).mock.calls[0][2] as {
    style?: string;
    onPress?: () => void;
  }[];
  act(() => {
    buttons.find((button) => button.style === 'destructive')?.onPress?.();
  });
}

beforeEach(() => {
  (maybeRequestStoreReview as jest.Mock).mockClear();
  mockPush.mockClear();
  mockReplace.mockClear();
  mockSetOptions.mockClear();
  (appAlert as unknown as jest.Mock).mockClear();
  resetStores();
});

describe('ActiveSessionScreen — fin de séance', () => {
  it('remplace vers l’écran Stats (onglet Séances) et ne redirige jamais vers session', () => {
    useActiveSessionStore.setState({ active: makeActiveSession() });

    render(<ActiveSessionScreen />);

    fireEvent.press(screen.getByText('Terminer'));

    const mockAppAlert = appAlert as unknown as jest.Mock;
    expect(mockAppAlert).toHaveBeenCalledTimes(1);

    const buttons = mockAppAlert.mock.calls[0][2] as Array<{
      style?: string;
      onPress?: () => void;
    }>;
    const confirm = buttons.find((button) => button.style === 'destructive');
    expect(confirm?.onPress).toBeDefined();

    act(() => {
      confirm?.onPress?.();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/progress?tab=sessions');
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/session');
  });
});

describe('ActiveSessionScreen — demande d’avis Google Play', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('propose l’avis après l’affichage de Stats, avec le nombre de séances terminées', () => {
    jest.useFakeTimers();
    useSessionStore.setState({ sessions: [makePastSession('old-1'), makePastSession('old-2')] });
    useActiveSessionStore.setState({ active: makeActiveSession() });

    render(<ActiveSessionScreen />);
    confirmFinish();

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/progress?tab=sessions');
    // Jamais pendant la navigation : la demande attend que Stats soit affiché.
    act(() => {
      jest.advanceTimersByTime(1499);
    });
    expect(maybeRequestStoreReview).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(maybeRequestStoreReview).toHaveBeenCalledTimes(1);
    expect(maybeRequestStoreReview).toHaveBeenCalledWith(3);
  });

  it('ne demande rien quand on continue la séance', () => {
    jest.useFakeTimers();
    useActiveSessionStore.setState({ active: makeActiveSession() });

    render(<ActiveSessionScreen />);
    fireEvent.press(screen.getByText('Terminer'));
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(maybeRequestStoreReview).not.toHaveBeenCalled();
  });
});
