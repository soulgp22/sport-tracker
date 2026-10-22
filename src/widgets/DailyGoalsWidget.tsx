"use no memo";
/**
 * `"use no memo"` : le React Compiler (app.json → experiments.reactCompiler)
 * reecrit chaque composant avec un cache memoise fonde sur des hooks.
 * react-native-android-widget n'execute PAS ces composants dans React : il
 * les appelle comme des fonctions brutes pour construire l'arbre natif, et
 * tout hook y leve « Invalid Hook Call ». Constate a l'ecran le 2026-10-20
 * (widget vide), voir known_bugs.md.
 */

/**
 * Widget Android « Objectifs du jour » (pas, seances de la semaine, depense
 * active), rendu par react-native-android-widget.
 *
 * Deux dispositions, choisies par la taille REELLE de la cellule que le
 * launcher communique (lib/widgets/dailyGoalsLayout) :
 * - pilule 4×1 : bandeau a trois segments, mini-anneau + grand chiffre ;
 * - carte 2×2  : grand anneau des pas + deux barres (seances, kcal).
 * Fond bleu nuit a 65 % d'opacite (demande d'Islam le 2026-10-22 : ni bloc
 * blanc, ni transparence totale), texte blanc.
 *
 * Arbre de primitives widget uniquement : ni hook, ni fragment `<>`, ni
 * store, ni theme (voir known_bugs.md). Tout vient de l'instantane ecrit par
 * l'accueil (lib/widgets/dailyGoalsWidgetSnapshot), deja traduit et calcule.
 */
import {
  FlexWidget,
  OverlapWidget,
  SvgWidget,
  TextWidget,
  type ColorProp,
} from 'react-native-android-widget';

import type { DailyGoalsSnapshot, GoalRingState } from '../lib/dailyGoals';
import {
  dailyGoalsMetrics,
  type CardMetrics,
  type PillMetrics,
} from '../lib/widgets/dailyGoalsLayout';
import type { DailyGoalsWidgetLabels } from '../lib/widgets/dailyGoalsWidgetSnapshot';

const COLORS = {
  /** Bleu nuit de la palette `lst`, a 65 % : lisible sur tout fond d'ecran. */
  background: 'rgba(14, 23, 39, 0.65)',
  text: '#ffffff',
  textSoft: '#c9d1dd',
  track: 'rgba(255, 255, 255, 0.22)',
  steps: '#3b82f6',
  sessions: '#8ea6ff',
  kcal: '#10b981',
} as const;

/** Polices copiees dans les assets natifs par le config plugin (app.json). */
const FONT_DISPLAY = 'OstrichSans-Heavy';
const FONT_SANS = 'Archivo_400Regular';
const FONT_SANS_BOLD = 'Archivo_700Bold';

function formatInteger(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}

/** Anneau SVG : piste translucide + arc de progression. */
export function ringSvg(ratio: number, color: ColorProp, size: number, stroke: number): string {
  const bounded = Math.max(0, Math.min(1, ratio));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - bounded);
  const center = size / 2;
  const arc =
    bounded > 0
      ? `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${circumference} ${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 ${center} ${center})"/>`
      : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${COLORS.track}" stroke-width="${stroke}"/>` +
    arc +
    '</svg>'
  );
}

function ratioOf(state: GoalRingState): number {
  return state.kind === 'progress' ? state.ratio : 0;
}

function strokeOf(state: GoalRingState, color: ColorProp): ColorProp {
  return state.kind === 'progress' && state.reached ? COLORS.kcal : color;
}

function valueText(state: GoalRingState, locale: string): string {
  return state.kind === 'progress' ? formatInteger(state.value, locale) : '—';
}

/* ------------------------------- Pilule 4×1 ------------------------------ */

interface SegmentProps {
  state: GoalRingState;
  label: string;
  color: ColorProp;
  locale: string;
  m: PillMetrics;
  divider: boolean;
}

function PillSegment({ state, label, color, locale, m, divider }: SegmentProps) {
  const goal = formatInteger(state.goal, locale);
  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        flexGap: 6,
        paddingLeft: divider ? 8 : 0,
        borderLeftWidth: divider ? 1 : 0,
        borderLeftColor: COLORS.track,
      }}>
      <SvgWidget
        svg={ringSvg(ratioOf(state), strokeOf(state, color), m.ringSize, m.ringStroke)}
        style={{ width: m.ringSize, height: m.ringSize }}
      />
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <TextWidget
          text={valueText(state, locale)}
          maxLines={1}
          style={{ fontFamily: FONT_DISPLAY, fontSize: m.valueFontSize, color: COLORS.text }}
        />
        <TextWidget
          text={`${label} · / ${goal}`.toUpperCase()}
          maxLines={1}
          truncate="END"
          style={{
            fontFamily: FONT_SANS,
            fontSize: m.labelFontSize,
            letterSpacing: 0.06,
            color: COLORS.textSoft,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function PillLayout({ snapshot, labels, locale, m }: LayoutProps<PillMetrics>) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <FlexWidget
        style={{
          width: 'match_parent',
          height: m.height,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: COLORS.background,
          borderRadius: m.borderRadius,
          paddingHorizontal: m.paddingHorizontal,
        }}>
        <PillSegment state={snapshot.steps} label={labels.steps} color={COLORS.steps} locale={locale} m={m} divider={false} />
        <PillSegment state={snapshot.sessions} label={labels.sessions} color={COLORS.sessions} locale={locale} m={m} divider />
        <PillSegment state={snapshot.activeKcal} label={labels.activeKcal} color={COLORS.kcal} locale={locale} m={m} divider />
      </FlexWidget>
    </FlexWidget>
  );
}

/* -------------------------------- Carte 2×2 ------------------------------ */

interface BarRowProps {
  state: GoalRingState;
  label: string;
  color: ColorProp;
  locale: string;
  m: CardMetrics;
}

function BarRow({ state, label, color, locale, m }: BarRowProps) {
  const fill = Math.round(m.barWidth * ratioOf(state));
  const value =
    state.kind === 'progress'
      ? `${formatInteger(state.value, locale)}/${formatInteger(state.goal, locale)}`
      : '—';
  return (
    <FlexWidget
      style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 8, marginTop: 6 }}>
      <TextWidget
        text={label}
        maxLines={1}
        truncate="END"
        style={{ fontFamily: FONT_SANS, fontSize: m.rowFontSize, color: COLORS.textSoft, width: Math.round(m.width * 0.3) }}
      />
      <FlexWidget
        style={{
          flex: 1,
          height: m.barHeight,
          borderRadius: m.barHeight,
          backgroundColor: COLORS.track,
          flexDirection: 'row',
        }}>
        {fill > 0 ? (
          <FlexWidget
            style={{
              width: fill,
              height: m.barHeight,
              borderRadius: m.barHeight,
              backgroundColor: strokeOf(state, color),
            }}
          />
        ) : null}
      </FlexWidget>
      <TextWidget
        text={value}
        maxLines={1}
        style={{ fontFamily: FONT_DISPLAY, fontSize: m.rowValueFontSize, color: COLORS.text }}
      />
    </FlexWidget>
  );
}

function CardLayout({ snapshot, labels, locale, m }: LayoutProps<CardMetrics>) {
  const steps = snapshot.steps;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        borderRadius: m.borderRadius,
        padding: m.padding,
      }}>
      <OverlapWidget style={{ width: m.ringSize, height: m.ringSize }}>
        <SvgWidget
          svg={ringSvg(ratioOf(steps), strokeOf(steps, COLORS.steps), m.ringSize, m.ringStroke)}
          style={{ width: m.ringSize, height: m.ringSize }}
        />
        <FlexWidget
          style={{
            width: m.ringSize,
            height: m.ringSize,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <TextWidget
            text={valueText(steps, locale)}
            maxLines={1}
            style={{ fontFamily: FONT_DISPLAY, fontSize: m.ringValueFontSize, color: COLORS.text }}
          />
          <TextWidget
            text={`/ ${formatInteger(steps.goal, locale)} ${labels.steps}`.toLowerCase()}
            maxLines={1}
            style={{ fontFamily: FONT_SANS, fontSize: m.ringGoalFontSize, color: COLORS.textSoft }}
          />
        </FlexWidget>
      </OverlapWidget>
      <BarRow state={snapshot.sessions} label={labels.sessions} color={COLORS.sessions} locale={locale} m={m} />
      <BarRow state={snapshot.activeKcal} label={labels.activeKcal} color={COLORS.kcal} locale={locale} m={m} />
    </FlexWidget>
  );
}

/* --------------------------------- Entree -------------------------------- */

interface LayoutProps<M> {
  snapshot: DailyGoalsSnapshot;
  labels: DailyGoalsWidgetLabels;
  locale: string;
  m: M;
}

export interface DailyGoalsWidgetProps {
  snapshot: DailyGoalsSnapshot;
  labels: DailyGoalsWidgetLabels;
  locale: string;
  /** Taille reelle de la cellule, en dp (WidgetInfo du launcher). */
  width: number;
  height: number;
}

export function DailyGoalsWidget({ snapshot, labels, locale, width, height }: DailyGoalsWidgetProps) {
  const m = dailyGoalsMetrics(width, height);
  if (m.layout === 'card') {
    return <CardLayout snapshot={snapshot} labels={labels} locale={locale} m={m} />;
  }
  return <PillLayout snapshot={snapshot} labels={labels} locale={locale} m={m} />;
}

/** Etat affiche tant que l'app n'a jamais ecrit d'instantane. */
export function DailyGoalsWidgetEmpty() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <FlexWidget
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.background,
          borderRadius: 24,
          paddingHorizontal: 18,
          paddingVertical: 12,
        }}>
        <TextWidget
          text="LIFE SPORT TRACKER"
          style={{ fontFamily: FONT_SANS_BOLD, fontSize: 11, letterSpacing: 0.1, color: COLORS.text }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
