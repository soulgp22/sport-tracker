import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Program } from '../../types';

interface ProgramCardProps {
  program: Program;
  onPress: () => void;
  onDelete: () => void;
}

export function ProgramCard({ program, onPress, onDelete }: ProgramCardProps) {
  const totalExercises = program.days.reduce((sum, d) => sum + d.exercises.length, 0);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{program.name}</Text>
        <Text style={styles.meta}>
          {program.days.length} jour{program.days.length !== 1 ? 's' : ''} · {totalExercises} exercice{totalExercises !== 1 ? 's' : ''}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 13, color: '#6b7280' },
  deleteBtn: { paddingHorizontal: 8 },
});
