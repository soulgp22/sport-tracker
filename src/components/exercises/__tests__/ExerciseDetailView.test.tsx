import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ExerciseDetailView } from '../ExerciseDetailView';
import { buildExerciseMediaUrl } from '../../../constants/exerciseMedia';
import { useExerciseCatalogStore } from '../../../store/exerciseCatalogStore';
import { useLanguageStore } from '../../../store/languageStore';
import type { CatalogExercise } from '../../../types';

// expo-image est moqué pour ne jamais déclencher un vrai téléchargement :
// on vérifie seulement qu'une <Image> distante est bien rendue.
jest.mock('expo-image', () => {
  const React = jest.requireActual<any>('react');
  const { View } = jest.requireActual<any>('react-native');
  return {
    Image: (props: any) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

// safe-area-context est un module natif : on le remplace par un simple <View>.
jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual<any>('react');
  const { View } = jest.requireActual<any>('react-native');
  return {
    SafeAreaView: ({ children, ...rest }: any) => React.createElement(View, rest, children),
  };
});

// Le viewer 3D importe expo-asset, expo-file-system/legacy et un composant DOM
// (@google/model-viewer). Ce test ne vise que la branche média : on l'isole.
jest.mock('../ExerciseModel3D', () => ({
  ExerciseModel3D: () => null,
}));

// exerciseModels fait des require() sur des binaires .glb, illisibles par Jest.
// Un catalogue vide = « pas de modèle 3D », exactement le scénario à tester.
jest.mock('../../../data/exerciseModels', () => ({
  exerciseModels: {},
}));

const ID = 'test-sans-media-001';

// Exercice minimal dont l'identifiant n'existe dans AUCUNE table de médias :
// ni exerciseGifs, ni exerciseMedia, ni exerciseModels, et sans remoteMediaBaseUrl.
const exerciseSansMedia: CatalogExercise = {
  id: ID,
  name: 'Test sans média',
  bodyPart: 'chest',
  target: 'chest',
  secondaryMuscles: [],
  equipment: 'body only',
  instructions: [],
  gif: { a: '', b: '' },
};

const COMPLETE_ID = 'test-complet-001';
const completeExercise: CatalogExercise = {
  id: COMPLETE_ID,
  name: 'Développé couché',
  nameFr: 'Développé couché',
  bodyPart: 'chest',
  target: 'chest',
  secondaryMuscles: ['shoulders', 'triceps'],
  equipment: 'barbell',
  instructions: ['Lie on the bench.', 'Press the bar.'],
  instructionsFr: ['Allongez-vous sur le banc.', 'Poussez la barre.'],
  gif: { a: '', b: '' },
};

const NO_SECONDARY_ID = 'test-sans-secondaires-001';
const exerciseSansSecondaires: CatalogExercise = {
  id: NO_SECONDARY_ID,
  name: 'Curl biceps',
  nameFr: 'Curl biceps',
  bodyPart: 'biceps',
  target: 'biceps',
  secondaryMuscles: [],
  equipment: 'dumbbell',
  instructions: ['Curl the weight.'],
  instructionsFr: ['Fléchissez le poids.'],
  gif: { a: '', b: '' },
};

const NO_INSTRUCTIONS_ID = 'test-sans-instructions-001';
const exerciseSansInstructions: CatalogExercise = {
  id: NO_INSTRUCTIONS_ID,
  name: 'Gainage',
  nameFr: 'Gainage',
  bodyPart: 'abdominals',
  target: 'abdominals',
  secondaryMuscles: [],
  equipment: 'body only',
  instructions: [],
  gif: { a: '', b: '' },
};

describe('ExerciseDetailView', () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: 'fr' });

    // getById lit l'index module-level `byId`, reconstruit uniquement par
    // rebuildIndexes() (appelée à l'installPack et au chargement du module).
    // useExerciseCatalogStore.setState() ne suffirait donc pas : on alimente
    // le catalogue via installPack, qui appelle rebuildIndexes().
    useExerciseCatalogStore.getState().installPack('test-pack', [
      exerciseSansMedia,
      completeExercise,
      exerciseSansSecondaires,
      exerciseSansInstructions,
    ]);
  });

  it("rend l'animation (URL par défaut) pour un exercice sans gif, sans media ni base URL", () => {
    render(<ExerciseDetailView id={ID} onClose={() => {}} />);

    const image = screen.getByTestId('expo-image');
    expect(image.props.source).toEqual({ uri: buildExerciseMediaUrl(ID) });
  });

  it("affiche les instructions et le muscle principal d'un exercice complet", () => {
    render(<ExerciseDetailView id={COMPLETE_ID} onClose={() => {}} />);

    expect(screen.getByText('Allongez-vous sur le banc.')).toBeTruthy();
    expect(screen.getByText('Poussez la barre.')).toBeTruthy();
    expect(screen.getByText('Principal')).toBeTruthy();
    expect(screen.getAllByText('Pectoraux').length).toBeGreaterThan(0);
  });

  it("n'affiche pas la ligne « Secondaires » sans muscles secondaires", () => {
    render(<ExerciseDetailView id={NO_SECONDARY_ID} onClose={() => {}} />);

    expect(screen.queryByText('Secondaires')).toBeNull();
  });

  it("n'affiche pas la section Instructions sans instructions", () => {
    render(<ExerciseDetailView id={NO_INSTRUCTIONS_ID} onClose={() => {}} />);

    expect(screen.queryByText('Instructions')).toBeNull();
  });
});
