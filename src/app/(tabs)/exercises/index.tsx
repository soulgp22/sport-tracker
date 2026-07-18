import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseCatalogList } from '../../../components/exercises/ExerciseCatalogList';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';

export default function ExercisesScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ExerciseCatalogList
        onBrowseDownloads={() => router.push({ pathname: '/(tabs)/community' as never, params: { tab: 'exercises' } })}
        onSelect={(exercise) =>
          router.push({ pathname: '/(tabs)/exercises/[id]' as never, params: { id: exercise.id } })
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
});
