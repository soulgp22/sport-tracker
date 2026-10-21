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
 * Format 4×1, fond transparent, sans titre ni nom d'app (demande d'Islam le
 * 2026-10-21) : seuls les anneaux et leurs libelles se posent sur le fond
 * d'ecran. Le texte est blanc avec une ombre sombre, lisible sur un fond clair
 * comme sur un fond sombre, a la maniere des widgets d'horloge Android.
 *
 * Ce composant est un arbre de primitives widget (FlexWidget, SvgWidget,
 * TextWidget) : il ne connait ni les hooks, ni les stores, ni le theme de
 * l'app. Tout ce qu'il affiche vient de l'instantane ecrit par l'accueil
 * (lib/widgets/dailyGoalsWidgetSnapshot), deja traduit et deja calcule.
 * Ni fragment `<>` ni hook : la bibliotheque appelle chaque type d'element
 * comme une fonction (voir known_bugs.md).
 *
 * Les couleurs d'anneaux reprennent la palette `lst` (theme/palettes.ts) en
 * dur : le widget tourne hors de l'arbre React et ne peut pas lire `useColors`.
 */
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import type { DailyGoalsSnapshot, GoalRingState } from '../lib/dailyGoals';
import type { DailyGoalsWidgetLabels } from '../lib/widgets/dailyGoalsWidgetSnapshot';

const COLORS = {
  /** Texte sur fond d'ecran inconnu : blanc + ombre sombre. */
  text: '#ffffff',
  textSoft: '#e6e9ef',
  shadow: '#0e1727',
  /** Piste de l'anneau : blanc translucide, visible sur clair comme sur sombre. */
  track: 'rgba(255, 255, 255, 0.38)',
  primary: '#4f7bff',
  secondary: '#3b82f6',
  tertiary: '#10b981',
} as const;

/** Polices copiees dans les assets natifs par le config plugin (app.json). */
const FONT_DISPLAY = 'OstrichSans-Heavy';
const FONT_SANS = 'Archivo_400Regular';
const FONT_SANS_BOLD = 'Archivo_700Bold';

const RING_SIZE = 58;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const TEXT_SHADOW = {
  textShadowColor: COLORS.shadow,
  textShadowRadius: 3,
  textShadowOffset: { width: 0, height: 1 },
} as const;

function formatInteger(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}

/** Anneau SVG : piste translucide + arc de progression, meme geometrie que l'accueil. */
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
    `<circle cx="${center}" cy="${center}" r="${RING_RADIUS}" fill="none" stroke="${COLORS.track}" stroke-width="${RING_STROKE}"/>` +
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
            <FlexWidget style={{ flexDirection: 'column', alignItems: 'center' }}>
              <TextWidget
                text={formatInteger(state.value, locale)}
                maxLines={1}
                style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: COLORS.text, ...TEXT_SHADOW }}
              />
              <TextWidget
                text={`/ ${formatInteger(state.goal, locale)}`}
                maxLines={1}
                style={{ fontFamily: FONT_SANS, fontSize: 7, color: COLORS.textSoft, ...TEXT_SHADOW }}
              />
            </FlexWidget>
          ) : (
            <TextWidget
              text="—"
              style={{ fontFamily: FONT_SANS_BOLD, fontSize: 14, color: COLORS.textSoft, ...TEXT_SHADOW }}
            />
          )}
        </FlexWidget>
      </OverlapWidget>
      <TextWidget
        text={label.toUpperCase()}
        maxLines={1}
        style={{
          fontFamily: FONT_SANS,
          fontSize: 8,
          letterSpacing: 0.08,
          color: COLORS.textSoft,
          marginTop: 3,
          ...TEXT_SHADOW,
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingHorizontal: 8,
      }}>
      <Ring state={snapshot.steps} label={labels.steps} color={COLORS.secondary} locale={locale} />
      <Ring state={snapshot.sessions} label={labels.sessions} color={COLORS.primary} locale={locale} />
      <Ring state={snapshot.activeKcal} label={labels.activeKcal} color={COLORS.tertiary} locale={locale} />
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
      }}>
      <TextWidget
        text="LIFE SPORT TRACKER"
        style={{ fontFamily: FONT_SANS_BOLD, fontSize: 11, letterSpacing: 0.1, color: COLORS.text, ...TEXT_SHADOW }}
      />
    </FlexWidget>
  );
}
