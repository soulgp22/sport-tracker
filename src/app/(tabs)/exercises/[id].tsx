import { useLocalSearchParams, useRouter } from 'expo-router';

import { ExerciseDetailView } from '../../../components/exercises/ExerciseDetailView';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <ExerciseDetailView id={id} onClose={() => router.back()} />;
}
