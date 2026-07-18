import { useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProgramStore } from '../../../store/programStore';
import { ProgramCard } from '../../../components/programs/ProgramCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import { appAlert } from '../../../components/ui/AppDialog';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';

export default function ProgramsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const programs = useProgramStore((s) => s.programs);
  const deleteProgram = useProgramStore((s) => s.deleteProgram);

  const handleDelete = (id: string, name: string) => {
    appAlert('Supprimer', `Supprimer "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteProgram(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={programs}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            onPress={() => router.push(`/(tabs)/programs/${item.id}`)}
            onDelete={() => handleDelete(item.id, item.name)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="barbell-outline"
            title="Aucun programme"
            subtitle="Créez votre premier programme d'entraînement"
          />
        }
        contentContainerStyle={programs.length === 0 ? styles.emptyContainer : styles.list}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  list: { paddingBottom: 20 },
  emptyContainer: { flex: 1 },
});
