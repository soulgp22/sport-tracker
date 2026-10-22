/**
 * Pont entre l'app et les widgets Android « Objectifs du jour ».
 *
 * Deux entrees dans le selecteur de widgets (app.json), un seul rendu :
 * `DailyGoals` (bandeau 4×1) et `DailyGoalsCard` (carte 2×2). Chacune se
 * dessine d'apres la taille reelle de sa cellule (WidgetInfo), donc un
 * widget redimensionne change de disposition tout seul.
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
import {
  requestWidgetUpdate,
  type WidgetInfo,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';

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

export const DAILY_GOALS_WIDGET_NAMES = ['DailyGoals', 'DailyGoalsCard'] as const;
/** Nom historique du bandeau, garde pour les widgets deja poses. */
export const DAILY_GOALS_WIDGET_NAME = DAILY_GOALS_WIDGET_NAMES[0];

export interface PublishDailyGoalsWidgetInput {
  snapshot: DailyGoalsSnapshot;
  labels: DailyGoalsWidgetLabels;
  locale: string;
}

function render(input: PublishDailyGoalsWidgetInput, info: WidgetInfo) {
  return (
    <DailyGoalsWidget
      snapshot={input.snapshot}
      labels={input.labels}
      locale={input.locale}
      width={info.width}
      height={info.height}
    />
  );
}

export async function publishDailyGoalsWidget(input: PublishDailyGoalsWidgetInput): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await writeDailyGoalsWidgetSnapshot(input);
    for (const widgetName of DAILY_GOALS_WIDGET_NAMES) {
      await requestWidgetUpdate({
        widgetName,
        renderWidget: (info) => render(input, info),
      });
    }
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

function isDailyGoalsWidget(name: string): boolean {
  return DAILY_GOALS_WIDGET_NAMES.some((candidate) => candidate === name);
}

export async function dailyGoalsWidgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (!isDailyGoalsWidget(props.widgetInfo.widgetName)) return;
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
        render({ snapshot, labels: stored.labels, locale: stored.locale }, props.widgetInfo)
      );
      return;
    }
    default:
      return;
  }
}
