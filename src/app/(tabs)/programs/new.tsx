import { useMemo } from 'react';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useProgramStore } from '../../../store/programStore';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../constants/keyboard';

export default function NewProgramScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
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
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading}>Nouveau programme</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={keyboardAvoidingBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}>
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  keyboardAvoiding: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  content: { padding: 16, gap: 24 },
  btn: { marginTop: 8 },
});
