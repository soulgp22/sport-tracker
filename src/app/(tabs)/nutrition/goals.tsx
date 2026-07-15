import { useMemo } from 'react';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../constants/keyboard';
import { useNutritionGoalsStore } from '../../../store/nutritionGoalsStore';
import type { GoalType, NutritionGoals } from '../../../types';

type RequiredGoalField = 'dailyCalories' | 'protein' | 'carbs' | 'fat';
type OptionalWeightField = 'currentWeight' | 'targetWeight';
type GoalField = RequiredGoalField | OptionalWeightField;

const goalTypes: { label: string; value: GoalType }[] = [
  { label: 'Perte', value: 'loss' },
  { label: 'Maintien', value: 'maintenance' },
  { label: 'Prise de masse', value: 'gain' },
];

function numberToInput(value: number | undefined) {
  if (value === undefined) return '';
  return String(value).replace('.', ',');
}

function parseNumberInput(value: string) {
  return Number(value.trim().replace(',', '.'));
}

function parseRequiredNumber(value: string) {
  const parsed = parseNumberInput(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = parseNumberInput(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function NutritionGoalsScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const goals = useNutritionGoalsStore((s) => s.goals);
  const setGoals = useNutritionGoalsStore((s) => s.setGoals);

  const [values, setValues] = useState<Record<GoalField, string>>({
    dailyCalories: numberToInput(goals.dailyCalories),
    protein: numberToInput(goals.protein),
    carbs: numberToInput(goals.carbs),
    fat: numberToInput(goals.fat),
    currentWeight: numberToInput(goals.currentWeight),
    targetWeight: numberToInput(goals.targetWeight),
  });
  const [goalType, setGoalType] = useState<GoalType>(goals.goalType);
  const [errors, setErrors] = useState<Partial<Record<GoalField, string>>>({});

  const setValue = (field: GoalField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = () => {
    const requiredFields: RequiredGoalField[] = ['dailyCalories', 'protein', 'carbs', 'fat'];
    const weightFields: OptionalWeightField[] = ['currentWeight', 'targetWeight'];
    const nextErrors: Partial<Record<GoalField, string>> = {};
    const patch: NutritionGoals = {
      dailyCalories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      goalType,
    };

    requiredFields.forEach((field) => {
      const parsed = parseRequiredNumber(values[field]);
      if (parsed < 0) {
        nextErrors[field] = 'La valeur doit être supérieure ou égale à 0.';
        return;
      }

      patch[field] = parsed;
    });

    weightFields.forEach((field) => {
      const parsed = parseOptionalNumber(values[field]);
      if (parsed !== undefined && parsed < 0) {
        nextErrors[field] = 'La valeur doit être supérieure ou égale à 0.';
        return;
      }

      patch[field] = parsed;
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;
    return patch;
  };

  const handleSubmit = () => {
    const patch = validate();
    if (!patch) return;

    setGoals(patch);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading}>Objectifs</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={keyboardAvoidingBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objectif</Text>
            <View style={styles.goalTypeRow}>
              {goalTypes.map((item) => {
                const selected = item.value === goalType;

                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setGoalType(item.value)}
                    activeOpacity={0.75}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Apports quotidiens</Text>
            <TextInput
              label="Calories quotidiennes"
              value={values.dailyCalories}
              onChangeText={(value) => setValue('dailyCalories', value)}
              error={errors.dailyCalories}
              keyboardType="numeric"
              placeholder="0"
            />

            <View style={styles.twoColumns}>
              <View style={styles.columnField}>
                <TextInput
                  label="Protéines (g)"
                  value={values.protein}
                  onChangeText={(value) => setValue('protein', value)}
                  error={errors.protein}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.columnField}>
                <TextInput
                  label="Glucides (g)"
                  value={values.carbs}
                  onChangeText={(value) => setValue('carbs', value)}
                  error={errors.carbs}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            <TextInput
              label="Lipides (g)"
              value={values.fat}
              onChangeText={(value) => setValue('fat', value)}
              error={errors.fat}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Poids</Text>
            <View style={styles.twoColumns}>
              <View style={styles.columnField}>
                <TextInput
                  label="Poids actuel (kg)"
                  value={values.currentWeight}
                  onChangeText={(value) => setValue('currentWeight', value)}
                  error={errors.currentWeight}
                  keyboardType="numeric"
                  placeholder="Optionnel"
                />
              </View>
              <View style={styles.columnField}>
                <TextInput
                  label="Poids cible (kg)"
                  value={values.targetWeight}
                  onChangeText={(value) => setValue('targetWeight', value)}
                  error={errors.targetWeight}
                  keyboardType="numeric"
                  placeholder="Optionnel"
                />
              </View>
            </View>
          </View>

          <Button title="Enregistrer" onPress={handleSubmit} style={styles.submitButton} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  headerSpacer: { width: 24 },
  keyboardAvoiding: { flex: 1 },
  content: { padding: 16, gap: 22, paddingBottom: 32 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingBottom: 8,
  },
  goalTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
  chipTextSelected: { color: c.primaryText },
  twoColumns: { flexDirection: 'row', gap: 10 },
  columnField: { flex: 1, minWidth: 0 },
  submitButton: { marginTop: 4 },
});
