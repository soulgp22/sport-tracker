/**
 * Construit l'arbre du widget avec le VRAI constructeur de la bibliotheque
 * (`buildWidgetTree`, JS pur, sans module natif). Il appelle chaque type
 * d'element comme une fonction : un fragment `<>` (Symbol, pas une fonction)
 * ou un hook y leve, alors que le mock Jest par defaut rend `null` et ne voit
 * rien. Regression du 2026-10-20 (widget vide : fragment dans l'anneau).
 */
import { buildDailyGoalsSnapshot } from '../../lib/dailyGoals';
import { DailyGoalsWidget, DailyGoalsWidgetEmpty } from '../DailyGoalsWidget';

jest.mock('react-native-android-widget', () => ({
  ...jest.requireActual('react-native-android-widget/lib/module/widgets/FlexWidget'),
  ...jest.requireActual('react-native-android-widget/lib/module/widgets/TextWidget'),
  ...jest.requireActual('react-native-android-widget/lib/module/widgets/SvgWidget'),
  ...jest.requireActual('react-native-android-widget/lib/module/widgets/OverlapWidget'),
  requestWidgetUpdate: jest.fn(),
  registerWidgetTaskHandler: jest.fn(),
}));

interface Node {
  type: string;
  props: Record<string, unknown>;
  children?: Node[];
}

// Import profond sans declaration de types : le constructeur n'est pas exporte
// par l'index public (qui charge le module natif).
const { buildWidgetTree } = jest.requireActual<{ buildWidgetTree: (tree: unknown) => Node }>(
  'react-native-android-widget/lib/module/api/build-widget-tree'
);

function count(node: Node, type: string): number {
  return (node.type === type ? 1 : 0) + (node.children ?? []).reduce((n, c) => n + count(c, type), 0);
}

function texts(node: Node): string[] {
  const own = typeof node.props.text === 'string' ? [node.props.text] : [];
  return own.concat((node.children ?? []).flatMap(texts));
}

function nodes(node: Node): Node[] {
  return [node, ...(node.children ?? []).flatMap(nodes)];
}

const LABELS = { title: 'Objectifs du jour', steps: 'Pas', sessions: 'Séances', activeKcal: 'kcal' };
const SNAPSHOT = buildDailyGoalsSnapshot(
  { steps: 6240, activeKcal: 410, sessionsThisWeek: 2 },
  { stepsGoal: 8000, activeKcalGoal: 500, weeklySessionGoal: 3 }
);
const EMPTY = buildDailyGoalsSnapshot(
  { steps: null, activeKcal: null, sessionsThisWeek: 0 },
  { stepsGoal: 8000, activeKcalGoal: 500, weeklySessionGoal: 3 }
);

describe('DailyGoalsWidget — bandeau 4×1', () => {
  it('trois mini-anneaux, trois grands chiffres, libelle et objectif en petit', () => {
    const tree = buildWidgetTree(
      <DailyGoalsWidget snapshot={SNAPSHOT} labels={LABELS} locale="fr-FR" width={320} height={60} />
    );

    expect(tree.type).toBe('LinearLayoutWidget');
    expect(count(tree, 'SvgWidget')).toBe(3);
    const all = texts(tree);
    expect(all.some((t) => /^6.240$/.test(t))).toBe(true);
    expect(all).toContain('2');
    expect(all.some((t) => /^PAS · \/ 8.000$/.test(t))).toBe(true);
    expect(all.some((t) => /^SÉANCES · \/ 3$/.test(t))).toBe(true);
    // Ni titre ni nom d'app.
    expect(all.some((t) => /OBJECTIFS|LIFE SPORT/.test(t))).toBe(false);
  });

  it('a un fond bleu nuit translucide, jamais opaque ni totalement transparent', () => {
    const tree = buildWidgetTree(
      <DailyGoalsWidget snapshot={SNAPSHOT} labels={LABELS} locale="fr-FR" width={320} height={60} />
    );
    const backgrounds = nodes(tree)
      .map((n) => n.props.backgroundColor)
      .filter((c): c is string => typeof c === 'string');
    // La bibliotheque convertit rgba(14, 23, 39, 0.65) en ARGB : alpha 0xa6 = 65 %.
    expect(backgrounds).toContain('#a60e1727');
  });

  it('sans donnee : tiret, jamais 0', () => {
    const all = texts(
      buildWidgetTree(<DailyGoalsWidget snapshot={EMPTY} labels={LABELS} locale="fr-FR" width={320} height={60} />)
    );
    expect(all.filter((t) => t === '—')).toHaveLength(2);
    expect(all).toContain('0');
  });
});

describe('DailyGoalsWidget — carte 2×2', () => {
  it('un grand anneau pour les pas et deux barres pour le reste', () => {
    const tree = buildWidgetTree(
      <DailyGoalsWidget snapshot={SNAPSHOT} labels={LABELS} locale="fr-FR" width={160} height={160} />
    );

    expect(count(tree, 'SvgWidget')).toBe(1);
    const all = texts(tree);
    expect(all.some((t) => /^6.240$/.test(t))).toBe(true);
    expect(all.some((t) => /^\/ 8.000 pas$/.test(t))).toBe(true);
    expect(all).toContain('2/3');
    expect(all).toContain('410/500');
  });

  it('la barre se remplit au prorata de la progression', () => {
    const tree = buildWidgetTree(
      <DailyGoalsWidget snapshot={SNAPSHOT} labels={LABELS} locale="fr-FR" width={160} height={160} />
    );
    // Les barres : conteneurs a fond « piste » dont le premier enfant a une largeur numerique.
    const tracks = nodes(tree).filter((n) => n.props.backgroundColor === '#38ffffff');
    expect(tracks).toHaveLength(2);
    const fills = tracks.map((t) => (t.children?.[0]?.props.width as number) ?? 0);
    // 2/3 de seances > 410/500 ? Non : 0,67 < 0,82. La barre kcal est plus longue.
    expect(fills[1]).toBeGreaterThan(fills[0]);
    expect(fills[0]).toBeGreaterThan(0);
  });

  it('un redimensionnement en bandeau change de disposition tout seul', () => {
    const asCard = buildWidgetTree(
      <DailyGoalsWidget snapshot={SNAPSHOT} labels={LABELS} locale="fr-FR" width={320} height={180} />
    );
    const asPill = buildWidgetTree(
      <DailyGoalsWidget snapshot={SNAPSHOT} labels={LABELS} locale="fr-FR" width={340} height={70} />
    );
    expect(count(asCard, 'SvgWidget')).toBe(1);
    expect(count(asPill, 'SvgWidget')).toBe(3);
  });
});

it("l'etat vide se construit aussi", () => {
  expect(() => buildWidgetTree(<DailyGoalsWidgetEmpty />)).not.toThrow();
});
