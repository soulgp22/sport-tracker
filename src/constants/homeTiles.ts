import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface HomeTile {
  key: string;
  labelKey: string;
  descriptionKey: string;
  icon: IoniconsName;
  accent: 'primary' | 'secondary' | 'success' | 'danger';
  href:
    | '/(tabs)/exercises'
    | '/(tabs)/nutrition'
    | '/(tabs)/history'
    | '/(tabs)/progress';
}

export const HOME_TILES: HomeTile[] = [
  { key: 'nutrition', labelKey: 'home.nutrition', descriptionKey: 'home.nutritionDescription', icon: 'nutrition', accent: 'success', href: '/(tabs)/nutrition' },
  { key: 'exercises', labelKey: 'home.exercises', descriptionKey: 'home.exercisesDescription', icon: 'accessibility', accent: 'secondary', href: '/(tabs)/exercises' },
  { key: 'progress', labelKey: 'home.progress', descriptionKey: 'home.progressDescription', icon: 'analytics', accent: 'danger', href: '/(tabs)/progress' },
  { key: 'history', labelKey: 'home.history', descriptionKey: 'home.historyDescription', icon: 'pulse', accent: 'secondary', href: '/(tabs)/history' },
];
