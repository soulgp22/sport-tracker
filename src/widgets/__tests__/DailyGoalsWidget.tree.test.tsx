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

const LABELS = { title: 'Objectifs du jour', steps: 'Pas', sessions: 'Séances · sem.', activeKcal: 'kcal actives' };

describe('DailyGoalsWidget — arbre natif', () => {
  it('se construit avec trois anneaux, les valeurs et les libelles', () => {
    const snapshot = buildDailyGoalsSnapshot(
      { steps: 6240, activeKcal: 410, sessionsThisWeek: 2 },
      { stepsGoal: 8000, activeKcalGoal: 500, weeklySessionGoal: 3 }
    );

    const tree = buildWidgetTree(
      <DailyGoalsWidget snapshot={snapshot} labels={LABELS} locale="fr-FR" />
    );

    // Nom natif de FlexWidget dans l'arbre construit.
    expect(tree.type).toBe('LinearLayoutWidget');
    expect(count(tree, 'SvgWidget')).toBe(3);
    const all = texts(tree);
    expect(all).toContain('/ 3');
    expect(all).toContain('2');
    expect(all).toContain('PAS');
    expect(all).toContain('OBJECTIFS DU JOUR');
    expect(all.some((t) => /^6.240$/.test(t))).toBe(true);
  });

  it('un anneau sans donnee affiche un tiret, jamais 0', () => {
    const snapshot = buildDailyGoalsSnapshot(
      { steps: null, activeKcal: null, sessionsThisWeek: 0 },
      { stepsGoal: 8000, activeKcalGoal: 500, weeklySessionGoal: 3 }
    );

    const all = texts(buildWidgetTree(<DailyGoalsWidget snapshot={snapshot} labels={LABELS} locale="fr-FR" />));

    expect(all.filter((t) => t === '—')).toHaveLength(2);
    expect(all).toContain('0');
  });

  it("l'etat vide se construit aussi", () => {
    expect(() => buildWidgetTree(<DailyGoalsWidgetEmpty />)).not.toThrow();
  });
});
