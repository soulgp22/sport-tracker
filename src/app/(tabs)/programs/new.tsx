import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useProgramStore } from '../../../store/programStore';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';

export default function NewProgramScreen() {
  const router = useRouter();
  const addProgram = useProgramStore((s) => s.addProgram);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }
    const program = addProgram(name.trim());
    router.replace(`/(tabs)/programs/${program.id}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.heading}>Nouveau programme</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <TextInput
            label="Nom du programme"
            placeholder="Ex : PPL, Full Body, Push..."
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            error={error}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          <Button title="Créer le programme" onPress={handleCreate} style={styles.btn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 16, gap: 24 },
  btn: { marginTop: 8 },
});
