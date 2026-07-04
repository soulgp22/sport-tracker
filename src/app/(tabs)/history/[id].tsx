import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSessionStore } from '../../../store/sessionStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ExerciseThumbnail } from '../../../components/exercises/ExerciseThumbnail';
import { getCatalogExerciseName } from '../../../store/exerciseCatalogStore';

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const deleteSession = useSessionStore((s) => s.deleteSession);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="alert-circle-outline" title="Séance introuvable" />
      </SafeAreaView>
    );
  }

  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleDelete = () => {
    Alert.alert('Supprimer', 'Supprimer cette séance ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => { deleteSession(id); router.back(); },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.heading} numberOfLines={1}>
          {session.programName ?? 'Séance libre'}
        </Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Meta */}
        <View style={styles.metaCard}>
          <Text style={styles.metaDate}>{dateStr}</Text>
          {session.dayName ? <Text style={styles.metaDay}>{session.dayName}</Text> : null}
          <Text style={styles.metaDuration}>Durée : {fmt(session.durationSeconds)}</Text>
        </View>

        {/* Exercises */}
        {session.exercises.map((ex, i) => {
          const doneSets = ex.sets.filter((s) => s.completed);
          return (
            <View key={i} style={styles.exCard}>
              <View style={styles.exHeader}>
                <ExerciseThumbnail id={ex.exerciseId} size={40} />
                <Text style={styles.exName} numberOfLines={1}>
                  {getCatalogExerciseName(ex.exerciseId, ex.exerciseName || `Exercice ${i + 1}`)}
                </Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableCellSm]}>Série</Text>
                <Text style={styles.tableCell}>Reps</Text>
                <Text style={styles.tableCell}>Poids (kg)</Text>
              </View>
              {doneSets.map((s, si) => (
                <View key={si} style={[styles.tableRow, si % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, styles.tableCellSm]}>{si + 1}</Text>
                  <Text style={styles.tableCell}>{s.actualReps}</Text>
                  <Text style={styles.tableCell}>{s.actualWeight}</Text>
                </View>
              ))}
              {doneSets.length === 0 && (
                <Text style={styles.noSets}>Aucune série logguée</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 16, gap: 12 },
  metaCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  metaDate: { fontSize: 15, fontWeight: '600', color: '#1d4ed8', textTransform: 'capitalize' },
  metaDay: { fontSize: 14, color: '#2563eb' },
  metaDuration: { fontSize: 13, color: '#3b82f6', marginTop: 4 },
  exCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  exName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 5 },
  tableRowAlt: { backgroundColor: '#f9fafb' },
  tableCell: { flex: 1, fontSize: 14, color: '#374151', textAlign: 'center' },
  tableCellSm: { flex: 0.5, color: '#6b7280' },
  noSets: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },
});
