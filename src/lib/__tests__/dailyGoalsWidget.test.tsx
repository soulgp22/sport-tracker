import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { buildDailyGoalsSnapshot } from '../dailyGoals';
import { hasHealthPermissions, isHealthConnectAvailable, readStepsToday } from '../healthConnect';
import {
  DAILY_GOALS_WIDGET_NAME,
  dailyGoalsWidgetTaskHandler,
  publishDailyGoalsWidget,
} from '../widgets/dailyGoalsWidget';
import { DAILY_GOALS_WIDGET_SNAPSHOT_KEY, writeDailyGoalsWidgetSnapshot } from '../widgets/dailyGoalsWidgetSnapshot';
import { DailyGoalsWidget, DailyGoalsWidgetEmpty, ringSvg } from '../../widgets/DailyGoalsWidget';

jest.mock('../healthConnect', () => ({
  isHealthConnectAvailable: jest.fn(),
  hasHealthPermissions: jest.fn(),
  readStepsToday: jest.fn(),
}));

const LABELS = { title: 'Objectifs du jour', steps: 'Pas', sessions: 'Séances · sem.', activeKcal: 'kcal actives' };
const SNAPSHOT = buildDailyGoalsSnapshot(
  { steps: 6240, activeKcal: 410, sessionsThisWeek: 2 },
  { stepsGoal: 8000, activeKcalGoal: 500, weeklySessionGoal: 3 }
);

function handlerProps(widgetAction: WidgetTaskHandlerProps['widgetAction']): WidgetTaskHandlerProps {
  return {
    widgetAction,
    widgetInfo: {
      widgetName: DAILY_GOALS_WIDGET_NAME,
      widgetId: 1,
      width: 320,
      height: 120,
      screenInfo: { screenHeightDp: 800, screenWidthDp: 360, density: 2, densityDpi: 320 },
    },
    renderWidget: jest.fn(),
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  (requestWidgetUpdate as jest.Mock).mockClear();
  (isHealthConnectAvailable as jest.Mock).mockResolvedValue(false);
  (hasHealthPermissions as jest.Mock).mockResolvedValue(false);
  (readStepsToday as jest.Mock).mockResolvedValue(null);
});

describe('publishDailyGoalsWidget', () => {
  it('sur Android, ecrit l’instantane puis demande la mise a jour du widget', async () => {
    Platform.OS = 'android';

    await publishDailyGoalsWidget({ snapshot: SNAPSHOT, labels: LABELS, locale: 'fr-FR' });

    expect(await AsyncStorage.getItem(DAILY_GOALS_WIDGET_SNAPSHOT_KEY)).toContain('"value":6240');
    expect(requestWidgetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ widgetName: DAILY_GOALS_WIDGET_NAME })
    );
  });

  it('hors Android, ne touche a rien', async () => {
    Platform.OS = 'ios';

    await publishDailyGoalsWidget({ snapshot: SNAPSHOT, labels: LABELS, locale: 'fr-FR' });

    expect(await AsyncStorage.getItem(DAILY_GOALS_WIDGET_SNAPSHOT_KEY)).toBeNull();
    expect(requestWidgetUpdate).not.toHaveBeenCalled();
    Platform.OS = 'android';
  });

  it('un echec natif ne remonte pas jusqu’a l’accueil', async () => {
    Platform.OS = 'android';
    (requestWidgetUpdate as jest.Mock).mockRejectedValueOnce(new Error('pas de widget'));

    await expect(
      publishDailyGoalsWidget({ snapshot: SNAPSHOT, labels: LABELS, locale: 'fr-FR' })
    ).resolves.toBeUndefined();
  });
});

describe('dailyGoalsWidgetTaskHandler', () => {
  it('sans instantane, rend l’etat vide', async () => {
    const props = handlerProps('WIDGET_ADDED');

    await dailyGoalsWidgetTaskHandler(props);

    const rendered = (props.renderWidget as jest.Mock).mock.calls[0][0];
    expect(rendered.type).toBe(DailyGoalsWidgetEmpty);
  });

  it('avec un instantane du jour, rend les trois anneaux tels quels', async () => {
    await writeDailyGoalsWidgetSnapshot({ snapshot: SNAPSHOT, labels: LABELS, locale: 'fr-FR' });
    const props = handlerProps('WIDGET_UPDATE');

    await dailyGoalsWidgetTaskHandler(props);

    const rendered = (props.renderWidget as jest.Mock).mock.calls[0][0];
    expect(rendered.type).toBe(DailyGoalsWidget);
    expect(rendered.props.snapshot).toEqual(SNAPSHOT);
    expect(rendered.props.labels).toEqual(LABELS);
  });

  it('rafraichit les pas depuis Health Connect quand il repond', async () => {
    await writeDailyGoalsWidgetSnapshot({ snapshot: SNAPSHOT, labels: LABELS, locale: 'fr-FR' });
    (isHealthConnectAvailable as jest.Mock).mockResolvedValue(true);
    (hasHealthPermissions as jest.Mock).mockResolvedValue(true);
    (readStepsToday as jest.Mock).mockResolvedValue(9000);
    const props = handlerProps('WIDGET_UPDATE');

    await dailyGoalsWidgetTaskHandler(props);

    const rendered = (props.renderWidget as jest.Mock).mock.calls[0][0];
    expect(rendered.props.snapshot.steps).toMatchObject({ value: 9000, goal: 8000, ratio: 1, reached: true });
    // Les autres anneaux ne bougent pas : seul Health Connect a ete relu.
    expect(rendered.props.snapshot.activeKcal).toEqual(SNAPSHOT.activeKcal);
    expect(rendered.props.snapshot.sessions).toEqual(SNAPSHOT.sessions);
  });

  it('ignore les clics et les widgets d’un autre nom', async () => {
    const click = handlerProps('WIDGET_CLICK');
    await dailyGoalsWidgetTaskHandler(click);
    expect(click.renderWidget).not.toHaveBeenCalled();

    const other = handlerProps('WIDGET_ADDED');
    other.widgetInfo.widgetName = 'Autre';
    await dailyGoalsWidgetTaskHandler(other);
    expect(other.renderWidget).not.toHaveBeenCalled();
  });
});

describe('ringSvg', () => {
  it('dessine la piste seule a 0 et un arc borne a 1', () => {
    expect((ringSvg(0, '#1f5fe0').match(/<circle/g) ?? []).length).toBe(1);
    expect((ringSvg(0.5, '#1f5fe0').match(/<circle/g) ?? []).length).toBe(2);
    expect(ringSvg(5, '#1f5fe0')).toContain('stroke-dashoffset="0"');
  });
});
