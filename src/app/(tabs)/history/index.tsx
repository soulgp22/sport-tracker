import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSessionStore } from '../../../store/sessionStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Session } from '../../../types';

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

function SessionCard({ session, onPress }: { session: Session; onPress: () => void }) {
  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardDate}>{dateStr}</Text>
        <Text style={styles.cardTitle}>{session.programName ?? 'Séance libre'}</Text>
        {session.dayName ? <Text style={styles.cardSub}>{session.dayName}</Text> : null}
        <Text style={styles.cardMeta}>
          {session.exercises.length} exercice{session.exercises.length !== 1 ? 's' : ''} · {totalSets} série{totalSets !== 1 ? 's' : ''} · {fmt(session.durationSeconds)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const sessions = useSessionStore((s) => s.sessions);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <SessionCard session={item} onPress={() => router.push(`/(tabs)/history/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="Aucune séance"
            subtitle="Démarrez votre première séance"
          />
        }
        contentContainerStyle={sessions.length === 0 ? styles.emptyContainer : styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  list: { paddingBottom: 20 },
  emptyContainer: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: { flex: 1, gap: 2 },
  cardDate: { fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  cardMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
