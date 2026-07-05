import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Program } from '../../types';
import { colors } from '../../constants/colors';

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
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: colors.overlay,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textSecondary },
  deleteBtn: { paddingHorizontal: 8 },
});
