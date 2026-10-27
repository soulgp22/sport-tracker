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
 *   ou rafraichi (toutes les 30 min, `updatePeriodMillis`, le minimum Android),
 *   meme app fermee. Il relit les pas dans Health Connect (permission de
 *   lecture en arriere-plan) et RECALCULE les trois anneaux avec les entrees
 *   que l'accueil a deposees (lib/widgets/dailyGoalsWidgetRefresh).
 *   Chaque rafraichissement laisse une trace (`readWidgetLastRefresh`) que
 *   l'ecran Parametres affiche : c'est elle qui dit pourquoi le widget ne
 *   bouge pas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  requestWidgetUpdate,
  type WidgetInfo,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';

import { warn } from '../logger';
import type { DailyGoalsSnapshot } from '../dailyGoals';
import { readStepsTodayInBackground } from '../healthConnect';
import { DailyGoalsWidget, DailyGoalsWidgetEmpty } from '../../widgets/DailyGoalsWidget';
import { refreshDailyGoalsSnapshot } from './dailyGoalsWidgetRefresh';
import {
  readRawDailyGoalsWidgetSnapshot,
  writeDailyGoalsWidgetSnapshot,
  type DailyGoalsWidgetInputs,
  type DailyGoalsWidgetLabels,
} from './dailyGoalsWidgetSnapshot';

export const DAILY_GOALS_WIDGET_NAMES = ['DailyGoals', 'DailyGoalsCard'] as const;
/** Nom historique du bandeau, garde pour les widgets deja poses. */
export const DAILY_GOALS_WIDGET_NAME = DAILY_GOALS_WIDGET_NAMES[0];

export interface PublishDailyGoalsWidgetInput {
  snapshot: DailyGoalsSnapshot;
  labels: DailyGoalsWidgetLabels;
  locale: string;
  /** Entrees du recalcul en arriere-plan (cibles, seances, profil). */
  inputs?: DailyGoalsWidgetInputs;
}

export const WIDGET_LAST_REFRESH_KEY = 'daily-goals-widget-last-refresh-v1';

/** Trace du dernier rafraichissement d'arriere-plan, affichee dans Parametres. */
export interface WidgetLastRefresh {
  /** Horodatage ISO. */
  at: string;
  /** true si les pas ont pu etre relus dans Health Connect. */
  ok: boolean;
  steps?: number;
  /** Message natif quand la lecture a echoue (permission, HC absent). */
  reason?: string;
}

async function recordLastRefresh(entry: WidgetLastRefresh): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_LAST_REFRESH_KEY, JSON.stringify(entry));
  } catch {
    // Une trace perdue ne doit jamais empecher le widget de se dessiner.
  }
}

export async function readWidgetLastRefresh(): Promise<WidgetLastRefresh | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_LAST_REFRESH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WidgetLastRefresh>;
    if (typeof parsed.at !== 'string' || typeof parsed.ok !== 'boolean') return null;
    return parsed as WidgetLastRefresh;
  } catch {
    return null;
  }
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

function isDailyGoalsWidget(name: string): boolean {
  return DAILY_GOALS_WIDGET_NAMES.some((candidate) => candidate === name);
}

export async function dailyGoalsWidgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (!isDailyGoalsWidget(props.widgetInfo.widgetName)) return;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const stored = await readRawDailyGoalsWidgetSnapshot();
      if (!stored) {
        props.renderWidget(<DailyGoalsWidgetEmpty />);
        return;
      }
      const now = new Date();
      const read = await readStepsTodayInBackground();
      await recordLastRefresh(
        read.ok
          ? { at: now.toISOString(), ok: true, steps: read.steps }
          : { at: now.toISOString(), ok: false, reason: read.reason }
      );
      const snapshot = refreshDailyGoalsSnapshot(stored, read.ok ? read.steps : null, now);
      props.renderWidget(
        render({ snapshot, labels: stored.labels, locale: stored.locale }, props.widgetInfo)
      );
      return;
    }
    default:
      return;
  }
}
