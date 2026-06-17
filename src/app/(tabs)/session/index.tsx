import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useProgramStore } from '../../../store/programStore';
import { useActiveSessionStore } from '../../../store/activeSessionStore';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Program, ProgramDay } from '../../../types';

export default function SessionScreen() {
  const router = useRouter();
  const programs = useProgramStore((s) => s.programs);
  const startSession = useActiveSessionStore((s) => s.startSession);
  const active = useActiveSessionStore((s) => s.active);

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedDay, setSelectedDay] = useState<ProgramDay | null>(null);

  // If there is already an active session, show resume button
  if (active) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.heading}>Séance</Text>
        </View>
        <View style={styles.resumeContainer}>
          <Ionicons name="play-circle" size={64} color="#2563eb" />
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Séance</Text>
      </View>

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
                  color="#6b7280"
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
                      color={selectedDay?.id === day.id ? '#2563eb' : '#9ca3af'}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  heading: { fontSize: 28, fontWeight: '700', color: '#111827' },
  list: { paddingBottom: 100 },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selected: { borderWidth: 2, borderColor: '#2563eb' },
  programName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 2,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
  },
  daySelected: { backgroundColor: '#eff6ff' },
  dayName: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500' },
  dayMeta: { fontSize: 13, color: '#9ca3af' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  resumeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  resumeTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  resumeSub: { fontSize: 15, color: '#6b7280' },
  resumeBtn: { width: '100%', marginTop: 8 },
});
