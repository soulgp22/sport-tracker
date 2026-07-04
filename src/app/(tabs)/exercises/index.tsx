import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseCatalogList } from '../../../components/exercises/ExerciseCatalogList';

export default function ExercisesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ExerciseCatalogList
        onSelect={(exercise) =>
          router.push({ pathname: '/(tabs)/exercises/[id]' as never, params: { id: exercise.id } })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
});
