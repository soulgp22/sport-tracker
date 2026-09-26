import React from 'react';
import { ScrollView } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SegmentedTabs, type SegmentedTabOption } from '../SegmentedTabs';

const OPTIONS: SegmentedTabOption<string>[] = [
  { value: 'exercises', label: 'Exercices' },
  { value: 'weight', label: 'Poids corporel' },
  { value: 'levels', label: 'Niveaux' },
  { value: 'sessions', label: 'Séances' },
  { value: 'calories', label: 'Dépense' },
  { value: 'steps', label: 'Pas' },
];

describe('SegmentedTabs — variante par défaut', () => {
  it('rend toutes les options', () => {
    render(
      <SegmentedTabs options={OPTIONS} value="exercises" onChange={() => {}} />
    );
    for (const option of OPTIONS) {
      expect(screen.getByText(option.label)).toBeTruthy();
    }
  });

  it('onPress appelle onChange avec la bonne valeur', () => {
    const onChange = jest.fn();
    render(
      <SegmentedTabs options={OPTIONS} value="exercises" onChange={onChange} />
    );
    fireEvent.press(screen.getByText('Poids corporel'));
    expect(onChange).toHaveBeenCalledWith('weight');
  });

  it("l'onglet sélectionné a accessibilityState.selected true", () => {
    render(
      <SegmentedTabs
        options={OPTIONS}
        value="weight"
        onChange={() => {}}
        testID="segmented"
      />
    );
    const selectedTab = screen.getByTestId('segmented-weight');
    expect(selectedTab.props.accessibilityState).toEqual({ selected: true });

    const otherTab = screen.getByTestId('segmented-exercises');
    expect(otherTab.props.accessibilityState).toEqual({ selected: false });
  });

  it('ne rend pas de ScrollView quand scrollable est faux', () => {
    render(
      <SegmentedTabs
        options={OPTIONS}
        value="exercises"
        onChange={() => {}}
        testID="segmented"
      />
    );
    expect(screen.queryByTestId('segmented-scroll')).toBeNull();
  });
});

describe('SegmentedTabs — variante scrollable', () => {
  it('rend le ScrollView `${testID}-scroll`', () => {
    render(
      <SegmentedTabs
        options={OPTIONS}
        value="exercises"
        onChange={() => {}}
        testID="segmented"
        scrollable
      />
    );
    expect(screen.getByTestId('segmented-scroll')).toBeTruthy();
  });

  it.each([
    {
      active: 'weight',
      description: '2e onglet (x=100) → centré, borné à 0',
      expectedX: 0,
    },
    {
      active: 'sessions',
      description: '4e onglet (x=300) → centré à 200',
      expectedX: 200,
    },
    {
      active: 'steps',
      description: 'dernier onglet (x=500) → borné à contentWidth - viewport (300)',
      expectedX: 300,
    },
  ])('$description : scrollTo avec x=$expectedX (animated: false au premier layout)', ({
    active,
    expectedX,
  }) => {
    const scrollSpy = jest.spyOn(ScrollView.prototype, 'scrollTo');

    render(
      <SegmentedTabs
        options={OPTIONS}
        value={active}
        onChange={() => {}}
        testID="segmented"
        scrollable
      />
    );

    const scroll = screen.getByTestId('segmented-scroll');

    // Layout du ScrollView : vue de 300 de large.
    fireEvent(scroll, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 50 } },
    });

    // Contenu : 6 onglets de 100 → largeur 600.
    fireEvent(scroll, 'contentSizeChange', 600, 50);

    // Layouts des 6 onglets (largeur 100, x = 0, 100, …, 500).
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab, index) => {
      fireEvent(tab, 'layout', {
        nativeEvent: { layout: { x: index * 100, y: 0, width: 100, height: 42 } },
      });
    });

    // Le premier défilement (dès que les mesures de l'onglet actif sont
    // connues) est non animé et centre l'onglet actif.
    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({ x: expectedX, animated: false })
    );

    scrollSpy.mockRestore();
  });

  it('défile une première fois (animated: false) même si les layouts des onglets arrivent avant celui du ScrollView', () => {
    const scrollSpy = jest.spyOn(ScrollView.prototype, 'scrollTo');

    render(
      <SegmentedTabs
        options={OPTIONS}
        value="sessions"
        onChange={() => {}}
        testID="segmented"
        scrollable
      />
    );

    const scroll = screen.getByTestId('segmented-scroll');

    // Ordre inversé : onglets d'abord, puis ScrollView, puis contentSizeChange.
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab, index) => {
      fireEvent(tab, 'layout', {
        nativeEvent: { layout: { x: index * 100, y: 0, width: 100, height: 42 } },
      });
    });
    fireEvent(scroll, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 50 } },
    });
    fireEvent(scroll, 'contentSizeChange', 600, 50);

    // « sessions » = index 3 : 300 + 50 - 150 = 200, premier défilement non animé.
    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({ x: 200, animated: false })
    );

    scrollSpy.mockRestore();
  });

  it('défile avec animated: true lors d\'un changement de value', () => {
    const scrollSpy = jest.spyOn(ScrollView.prototype, 'scrollTo');

    const view = render(
      <SegmentedTabs
        options={OPTIONS}
        value="exercises"
        onChange={() => {}}
        testID="segmented"
        scrollable
      />
    );

    const scroll = screen.getByTestId('segmented-scroll');
    fireEvent(scroll, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 50 } },
    });
    fireEvent(scroll, 'contentSizeChange', 600, 50);
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab, index) => {
      fireEvent(tab, 'layout', {
        nativeEvent: { layout: { x: index * 100, y: 0, width: 100, height: 42 } },
      });
    });

    scrollSpy.mockClear();

    // Nouvel onglet actif via rerender.
    view.rerender(
      <SegmentedTabs
        options={OPTIONS}
        value="steps"
        onChange={() => {}}
        testID="segmented"
        scrollable
      />
    );

    expect(scrollSpy).toHaveBeenCalledWith(
      expect.objectContaining({ x: 300, animated: true })
    );

    scrollSpy.mockRestore();
  });
});
