/**
 * Pont entre l'app et le widget Android « Objectifs du jour ».
 *
 * - `publishDailyGoalsWidget` : appele par l'accueil a chaque nouvel
 *   instantane. Ecrit l'instantane partage puis demande au launcher de
 *   redessiner les widgets poses. Silencieux hors Android ou sans widget.
 * - `dailyGoalsWidgetTaskHandler` : gestionnaire enregistre au demarrage JS
 *   (index.js). Le launcher l'appelle quand un widget est ajoute, redimensionne
 *   ou rafraichi (toutes les 30 min, `updatePeriodMillis`). Il relit
 *   l'instantane et, si Health Connect repond, rafraichit les pas du jour.
 */
import { Platform } from 'react-native';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { warn } from '../logger';
import { buildDailyGoalsSnapshot, type DailyGoalsSnapshot, type GoalRingState } from '../dailyGoals';
import { hasHealthPermissions, isHealthConnectAvailable, readStepsToday } from '../healthConnect';
import { DailyGoalsWidget, DailyGoalsWidgetEmpty } from '../../widgets/DailyGoalsWidget';
import {
  readDailyGoalsWidgetSnapshot,
  writeDailyGoalsWidgetSnapshot,
  type DailyGoalsWidgetLabels,
  type DailyGoalsWidgetSnapshot,
} from './dailyGoalsWidgetSnapshot';

export const DAILY_GOALS_WIDGET_NAME = 'DailyGoals';

export interface PublishDailyGoalsWidgetInput {
  snapshot: DailyGoalsSnapshot;
  labels: DailyGoalsWidgetLabels;
  locale: string;
}

export async function publishDailyGoalsWidget(input: PublishDailyGoalsWidgetInput): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await writeDailyGoalsWidgetSnapshot(input);
    await requestWidgetUpdate({
      widgetName: DAILY_GOALS_WIDGET_NAME,
      renderWidget: () => (
        <DailyGoalsWidget snapshot={input.snapshot} labels={input.labels} locale={input.locale} />
      ),
    });
  } catch (error) {
    warn('widget', 'publication du widget objectifs impossible', error);
  }
}

/**
 * Pas du jour relus directement dans Health Connect depuis la tache headless.
 * `null` si indisponible : l'instantane garde alors sa valeur.
 */
async function refreshStepsFromHealth(): Promise<number | null> {
  try {
    if (!(await isHealthConnectAvailable())) return null;
    if (!(await hasHealthPermissions())) return null;
    return await readStepsToday();
  } catch {
    return null;
  }
}

function withFreshSteps(stored: DailyGoalsWidgetSnapshot, steps: number | null): DailyGoalsSnapshot {
  if (steps === null || steps <= 0) return stored.snapshot;
  const fresh: GoalRingState = buildDailyGoalsSnapshot(
    { steps, activeKcal: null, sessionsThisWeek: 0 },
    { stepsGoal: stored.snapshot.steps.goal, activeKcalGoal: 1, weeklySessionGoal: 1 }
  ).steps;
  return { ...stored.snapshot, steps: fresh };
}

export async function dailyGoalsWidgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== DAILY_GOALS_WIDGET_NAME) return;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const stored = await readDailyGoalsWidgetSnapshot();
      if (!stored) {
        props.renderWidget(<DailyGoalsWidgetEmpty />);
        return;
      }
      const snapshot = withFreshSteps(stored, await refreshStepsFromHealth());
      props.renderWidget(
        <DailyGoalsWidget snapshot={snapshot} labels={stored.labels} locale={stored.locale} />
      );
      return;
    }
    default:
      return;
  }
}
