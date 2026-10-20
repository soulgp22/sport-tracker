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
 * Widget Android « Objectifs du jour » : trois anneaux (pas, seances de la
 * semaine, depense active), rendus par react-native-android-widget.
 *
 * Ce composant est un arbre de primitives widget (FlexWidget, SvgWidget,
 * TextWidget) : il ne connait ni les hooks, ni les stores, ni le theme de
 * l'app. Tout ce qu'il affiche vient de l'instantane ecrit par l'accueil
 * (lib/widgets/dailyGoalsWidgetSnapshot), deja traduit et deja calcule.
 *
 * Les couleurs reprennent la palette `lst` (theme/palettes.ts) en dur : le
 * widget tourne hors de l'arbre React et ne peut pas lire `useColors`.
 */
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import type { DailyGoalsSnapshot, GoalRingState } from '../lib/dailyGoals';
import type { DailyGoalsWidgetLabels } from '../lib/widgets/dailyGoalsWidgetSnapshot';

const COLORS = {
  surface: '#ffffff',
  surfaceAlt: '#f2f4f7',
  textPrimary: '#16233b',
  textMuted: '#8a94a3',
  primary: '#16233b',
  secondary: '#1f5fe0',
  tertiary: '#047857',
} as const;

/** Polices copiees dans les assets natifs par le config plugin (app.json). */
const FONT_DISPLAY = 'OstrichSans-Heavy';
const FONT_SANS = 'Archivo_400Regular';
const FONT_SANS_BOLD = 'Archivo_700Bold';

const RING_SIZE = 92;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatInteger(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}

/** Anneau SVG : piste grise + arc de progression, meme geometrie que l'accueil. */
export function ringSvg(ratio: number, color: string): string {
  const bounded = Math.max(0, Math.min(1, ratio));
  const offset = RING_CIRCUMFERENCE * (1 - bounded);
  const center = RING_SIZE / 2;
  const arc =
    bounded > 0
      ? `<circle cx="${center}" cy="${center}" r="${RING_RADIUS}" fill="none" stroke="${color}" stroke-width="${RING_STROKE}" stroke-linecap="round" stroke-dasharray="${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}" stroke-dashoffset="${offset}" transform="rotate(-90 ${center} ${center})"/>`
      : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${RING_SIZE}" height="${RING_SIZE}" viewBox="0 0 ${RING_SIZE} ${RING_SIZE}">` +
    `<circle cx="${center}" cy="${center}" r="${RING_RADIUS}" fill="none" stroke="${COLORS.surfaceAlt}" stroke-width="${RING_STROKE}"/>` +
    arc +
    '</svg>'
  );
}

interface RingProps {
  state: GoalRingState;
  label: string;
  color: string;
  locale: string;
}

function Ring({ state, label, color, locale }: RingProps) {
  const ratio = state.kind === 'progress' ? state.ratio : 0;
  const reached = state.kind === 'progress' && state.reached;
  const stroke = reached ? COLORS.tertiary : color;
  return (
    <FlexWidget style={{ flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <OverlapWidget style={{ width: RING_SIZE, height: RING_SIZE }}>
        <SvgWidget svg={ringSvg(ratio, stroke)} style={{ width: RING_SIZE, height: RING_SIZE }} />
        <FlexWidget
          style={{
            width: RING_SIZE,
            height: RING_SIZE,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {state.kind === 'progress' ? (
            // Pas de fragment `<>` : la bibliotheque appelle chaque type
            // d'element comme une fonction, Symbol(react.fragment) n'en est pas une.
            <FlexWidget style={{ flexDirection: 'column', alignItems: 'center' }}>
              <TextWidget
                text={formatInteger(state.value, locale)}
                maxLines={1}
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 20,
                  color: reached ? COLORS.tertiary : COLORS.textPrimary,
                }}
              />
              <TextWidget
                text={`/ ${formatInteger(state.goal, locale)}`}
                maxLines={1}
                style={{ fontFamily: FONT_SANS, fontSize: 9, color: COLORS.textMuted }}
              />
            </FlexWidget>
          ) : (
            <TextWidget
              text="—"
              style={{ fontFamily: FONT_SANS_BOLD, fontSize: 18, color: COLORS.textMuted }}
            />
          )}
        </FlexWidget>
      </OverlapWidget>
      <TextWidget
        text={label.toUpperCase()}
        maxLines={1}
        style={{
          fontFamily: FONT_SANS,
          fontSize: 9,
          letterSpacing: 0.08,
          color: COLORS.textMuted,
          marginTop: 6,
        }}
      />
    </FlexWidget>
  );
}

export interface DailyGoalsWidgetProps {
  snapshot: DailyGoalsSnapshot;
  labels: DailyGoalsWidgetLabels;
  locale: string;
}

export function DailyGoalsWidget({ snapshot, labels, locale }: DailyGoalsWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}>
      <FlexWidget
        style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextWidget
          text={labels.title.toUpperCase()}
          maxLines={1}
          style={{ fontFamily: FONT_SANS, fontSize: 9, letterSpacing: 0.1, color: COLORS.textMuted }}
        />
        <TextWidget
          text="LIFE SPORT TRACKER"
          maxLines={1}
          style={{ fontFamily: FONT_SANS_BOLD, fontSize: 9, letterSpacing: 0.1, color: COLORS.secondary }}
        />
      </FlexWidget>
      <FlexWidget
        style={{
          width: 'match_parent',
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 4,
        }}>
        <Ring state={snapshot.steps} label={labels.steps} color={COLORS.secondary} locale={locale} />
        <Ring state={snapshot.sessions} label={labels.sessions} color={COLORS.primary} locale={locale} />
        <Ring state={snapshot.activeKcal} label={labels.activeKcal} color={COLORS.tertiary} locale={locale} />
      </FlexWidget>
    </FlexWidget>
  );
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
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 14,
      }}>
      <TextWidget
        text="LIFE SPORT TRACKER"
        style={{ fontFamily: FONT_SANS_BOLD, fontSize: 11, letterSpacing: 0.1, color: COLORS.secondary }}
      />
    </FlexWidget>
  );
}
