import { useMemo } from 'react';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useProgramStore } from '../../../store/programStore';
import { useActiveSessionStore } from '../../../store/activeSessionStore';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import type { Program, ProgramDay } from '../../../types';

export default function SessionScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const programs = useProgramStore((s) => s.programs);
  const startSession = useActiveSessionStore((s) => s.startSession);
  const active = useActiveSessionStore((s) => s.active);

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedDay, setSelectedDay] = useState<ProgramDay | null>(null);

  // If there is already an active session, show resume button
  if (active) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.resumeContainer}>
          <Ionicons name="play-circle" size={64} color={c.primary} />
          <Text style={styles.resumeTitle}>Séance en cours</Text>
          <Text style={styles.resumeSub}>{active.programName} — {active.dayName}</Text>
          <Button title="Reprendre" onPress={() => router.push('/(tabs)/session/active')} style={styles.resumeBtn} />
        </View>
      </SafeAreaView>
    );
  }

  const handleStart = () => {
    if (!selectedProgram || !selectedDay) return;
    startSession(selectedProgram, selectedDay);
    router.push('/(tabs)/session/active');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {programs.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title="Aucun programme"
          subtitle="Créez d'abord un programme dans l'onglet Programmes"
        />
      ) : (
        <FlatList
          data={programs}
          keyExtractor={(p) => p.id}
          renderItem={({ item: program }) => (
            <View>
              <TouchableOpacity
                style={[styles.programRow, selectedProgram?.id === program.id && styles.selected]}
                onPress={() => {
                  setSelectedProgram(program);
                  setSelectedDay(null);
                }}
                activeOpacity={0.75}>
                <Text style={styles.programName}>{program.name}</Text>
                <Ionicons
                  name={selectedProgram?.id === program.id ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={c.textSecondary}
                />
              </TouchableOpacity>

              {selectedProgram?.id === program.id &&
                program.days.map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={[styles.dayRow, selectedDay?.id === day.id && styles.daySelected]}
                    onPress={() => setSelectedDay(day)}
                    activeOpacity={0.75}>
                    <Ionicons
                      name={selectedDay?.id === day.id ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selectedDay?.id === day.id ? c.primary : c.textMuted}
                    />
                    <Text style={styles.dayName}>{day.name}</Text>
                    <Text style={styles.dayMeta}>{day.exercises.length} exercices</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}

      {selectedDay && (
        <View style={styles.footer}>
          <Button title={`Démarrer — ${selectedDay.name}`} onPress={handleStart} />
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  list: { paddingBottom: 100 },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    padding: 14,
    shadowColor: c.overlay,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selected: { borderWidth: 2, borderColor: c.primary },
  programName: { flex: 1, fontSize: 16, fontWeight: '600', color: c.textPrimary },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 2,
    backgroundColor: c.surfaceAlt,
    borderRadius: 8,
    padding: 12,
  },
  daySelected: { backgroundColor: c.accentSoft },
  dayName: { flex: 1, fontSize: 15, color: c.textPrimary, fontWeight: '500' },
  dayMeta: { fontSize: 13, color: c.textMuted },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  resumeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  resumeTitle: { fontSize: 22, fontWeight: '700', color: c.textPrimary },
  resumeSub: { fontSize: 15, color: c.textSecondary },
  resumeBtn: { width: '100%', marginTop: 8 },
});
