import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { AnimatedExerciseImage } from '../AnimatedExerciseImage';
import { buildExerciseMediaUrl } from '../../../constants/exerciseMedia';

// expo-image est moqué pour ne jamais déclencher un vrai téléchargement :
// on vérifie seulement qu'une <Image> distante est bien rendue.
jest.mock('expo-image', () => {
  const React = jest.requireActual<any>('react');
  const { View } = jest.requireActual<any>('react-native');
  return {
    Image: (props: any) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

describe('AnimatedExerciseImage', () => {
  it("rend une <Image> distante même sans entrée dans exerciseGifs ni exerciseMedia", async () => {
    const id = 'exercise-zzz-000';
    render(<AnimatedExerciseImage id={id} animate />);

    const image = screen.getByTestId('expo-image');
    expect(image.props.source).toEqual({ uri: buildExerciseMediaUrl(id) });
  });
});
