import { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useProgramStore } from '../../../../store/programStore';
import { Button } from '../../../../components/ui/Button';
import { TextInput } from '../../../../components/ui/TextInput';
import { EmptyState } from '../../../../components/ui/EmptyState';
import type { ProgramDay } from '../../../../types';

function DayRow({
  day,
  onEdit,
  onDelete,
}: {
  day: ProgramDay;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={styles.dayRow} onPress={onEdit} activeOpacity={0.75}>
      <View style={styles.dayBody}>
        <Text style={styles.dayName}>{day.name}</Text>
        <Text style={styles.dayMeta}>
          {day.exercises.length} exercice{day.exercises.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
    </TouchableOpacity>
  );
}

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const program = useProgramStore((s) => s.programs.find((p) => p.id === id));
  const updateProgram = useProgramStore((s) => s.updateProgram);
  const addDay = useProgramStore((s) => s.addDay);
  const deleteDay = useProgramStore((s) => s.deleteDay);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(program?.name ?? '');
  const [addingDay, setAddingDay] = useState(false);
  const [newDayName, setNewDayName] = useState('');

  if (!program) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="alert-circle-outline" title="Programme introuvable" />
      </SafeAreaView>
    );
  }

  const saveName = () => {
    if (nameValue.trim()) updateProgram(id, { name: nameValue.trim() });
    setEditingName(false);
  };

  const handleAddDay = () => {
    if (!newDayName.trim()) return;
    const day = addDay(id, newDayName.trim());
    setNewDayName('');
    setAddingDay(false);
    router.push(`/(tabs)/programs/${id}/day/${day.id}`);
  };

  const handleDeleteDay = (dayId: string, dayName: string) => {
    Alert.alert('Supprimer', `Supprimer le jour "${dayName}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteDay(id, dayId) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          {editingName ? (
            <TextInput
              value={nameValue}
              onChangeText={setNameValue}
              onBlur={saveName}
              onSubmitEditing={saveName}
              returnKeyType="done"
              autoFocus
              style={styles.nameInput}
            />
          ) : (
            <TouchableOpacity onPress={() => { setNameValue(program.name); setEditingName(true); }} style={styles.nameBtn}>
              <Text style={styles.heading} numberOfLines={1}>{program.name}</Text>
              <Ionicons name="pencil-outline" size={16} color="#6b7280" />
            </TouchableOpacity>
          )}
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={program.days}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <DayRow
              day={item}
              onEdit={() => router.push(`/(tabs)/programs/${id}/day/${item.id}`)}
              onDelete={() => handleDeleteDay(item.id, item.name)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="Aucun jour"
              subtitle="Ajoutez un premier jour (ex : Push, Pull, Legs…)"
            />
          }
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>Jours d'entraînement</Text>
          }
          contentContainerStyle={program.days.length === 0 ? styles.emptyContainer : styles.list}
        />

        {/* Add day form */}
        <View style={styles.footer}>
          {addingDay ? (
            <View style={styles.addDayForm}>
              <TextInput
                placeholder="Nom du jour (ex : Push)"
                value={newDayName}
                onChangeText={setNewDayName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddDay}
                style={styles.addDayInput}
              />
              <View style={styles.addDayBtns}>
                <Button title="Annuler" variant="secondary" onPress={() => { setAddingDay(false); setNewDayName(''); }} style={styles.halfBtn} />
                <Button title="Ajouter" onPress={handleAddDay} style={styles.halfBtn} />
              </View>
            </View>
          ) : (
            <Button
              title="+ Ajouter un jour"
              variant="secondary"
              onPress={() => setAddingDay(true)}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  nameBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameInput: { flex: 1 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', flex: 1 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dayBody: { flex: 1, gap: 2 },
  dayName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  dayMeta: { fontSize: 13, color: '#6b7280' },
  deleteBtn: { paddingHorizontal: 8 },
  list: { paddingBottom: 16 },
  emptyContainer: { flex: 1 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
  addDayForm: { gap: 10 },
  addDayInput: {},
  addDayBtns: { flexDirection: 'row', gap: 8 },
  halfBtn: { flex: 1 },
});
