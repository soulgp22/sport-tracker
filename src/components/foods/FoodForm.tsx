import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../../constants/colors';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../constants/keyboard';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';
import { CategoryChips } from './CategoryChips';
import type { Food, FoodNutrition, FoodUnit } from '../../types';

export interface FoodFormValues {
  name: string;
  category: string;
  unit: FoodUnit;
  nutritionPer100g: FoodNutrition;
}

interface FoodFormProps {
  initialFood?: Food;
  categories: string[];
  submitLabel: string;
  onSubmit: (values: FoodFormValues) => void;
}

type FieldKey =
  | 'name'
  | 'category'
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'sugar'
  | 'salt';

const units: FoodUnit[] = ['g', 'ml', 'portion', 'unité'];
const requiredNumberFields = ['calories', 'protein', 'carbs', 'fat'] as const;
const optionalNumberFields = ['fiber', 'sugar', 'salt'] as const;

function numberToInput(value: number | undefined) {
  if (value === undefined) return '';
  return String(value).replace('.', ',');
}

function parseNumberInput(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function labelForNumberField(field: (typeof requiredNumberFields)[number] | (typeof optionalNumberFields)[number]) {
  switch (field) {
    case 'calories':
      return 'Calories';
    case 'protein':
      return 'Protéines';
    case 'carbs':
      return 'Glucides';
    case 'fat':
      return 'Lipides';
    case 'fiber':
      return 'Fibres';
    case 'sugar':
      return 'Sucre';
    case 'salt':
      return 'Sel';
  }
}

export function FoodForm({ initialFood, categories, submitLabel, onSubmit }: FoodFormProps) {
  const [name, setName] = useState(initialFood?.name ?? '');
  const [category, setCategory] = useState(initialFood?.category ?? '');
  const [unit, setUnit] = useState<FoodUnit>(initialFood?.unit ?? 'g');
  const [numberValues, setNumberValues] = useState({
    calories: numberToInput(initialFood?.nutritionPer100g.calories),
    protein: numberToInput(initialFood?.nutritionPer100g.protein),
    carbs: numberToInput(initialFood?.nutritionPer100g.carbs),
    fat: numberToInput(initialFood?.nutritionPer100g.fat),
    fiber: numberToInput(initialFood?.nutritionPer100g.fiber),
    sugar: numberToInput(initialFood?.nutritionPer100g.sugar),
    salt: numberToInput(initialFood?.nutritionPer100g.salt),
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const categorySuggestions = useMemo(
    () => categories.filter((item) => item.trim().length > 0),
    [categories]
  );

  const clearError = (field: FieldKey) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setNumberValue = (field: keyof typeof numberValues, value: string) => {
    setNumberValues((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  const validate = () => {
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    const nutrition: Partial<FoodNutrition> = {};

    if (!name.trim()) {
      nextErrors.name = 'Le nom est requis.';
    }

    if (!category.trim()) {
      nextErrors.category = 'La catégorie est requise.';
    }

    requiredNumberFields.forEach((field) => {
      const value = numberValues[field].trim();
      const label = labelForNumberField(field);

      if (!value) {
        nextErrors[field] = `${label} est requis.`;
        return;
      }

      const parsed = parseNumberInput(value);
      if (parsed === null) {
        nextErrors[field] = `${label} doit être un nombre.`;
        return;
      }

      if (parsed < 0) {
        nextErrors[field] = `${label} doit être supérieur ou égal à 0.`;
        return;
      }

      nutrition[field] = parsed;
    });

    optionalNumberFields.forEach((field) => {
      const value = numberValues[field].trim();
      if (!value) return;

      const label = labelForNumberField(field);
      const parsed = parseNumberInput(value);
      if (parsed === null) {
        nextErrors[field] = `${label} doit être un nombre.`;
        return;
      }

      if (parsed < 0) {
        nextErrors[field] = `${label} doit être supérieur ou égal à 0.`;
        return;
      }

      nutrition[field] = parsed;
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return null;

    return {
      name: name.trim(),
      category: category.trim(),
      unit,
      nutritionPer100g: nutrition as FoodNutrition,
    };
  };

  const handleSubmit = () => {
    const values = validate();
    if (!values) return;

    onSubmit(values);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={keyboardAvoidingBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <TextInput
            label="Nom"
            placeholder="Ex : Yaourt grec 0%"
            value={name}
            onChangeText={(value) => {
              setName(value);
              clearError('name');
            }}
            error={errors.name}
            autoFocus={!initialFood}
            returnKeyType="next"
          />

          <View style={styles.categoryBlock}>
            <TextInput
              label="Catégorie"
              placeholder="Ex : Produits laitiers"
              value={category}
              onChangeText={(value) => {
                setCategory(value);
                clearError('category');
              }}
              error={errors.category}
              returnKeyType="next"
            />

            {categorySuggestions.length > 0 ? (
              <CategoryChips
                categories={categorySuggestions}
                includeAll={false}
                selectedCategory={categorySuggestions.includes(category) ? category : ''}
                onSelect={(value) => {
                  setCategory(value);
                  clearError('category');
                }}
              />
            ) : null}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Unité</Text>
            <View style={styles.unitRow}>
              {units.map((item) => {
                const selected = item === unit;

                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.unitChip, selected && styles.unitChipSelected]}
                    onPress={() => setUnit(item)}
                    activeOpacity={0.75}>
                    <Text style={[styles.unitText, selected && styles.unitTextSelected]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition pour 100 g</Text>

          <TextInput
            label="Calories"
            value={numberValues.calories}
            onChangeText={(value) => setNumberValue('calories', value)}
            error={errors.calories}
            keyboardType="decimal-pad"
            placeholder="0"
          />

          <View style={styles.twoColumns}>
            <View style={styles.columnField}>
              <TextInput
                label="Protéines (g)"
                value={numberValues.protein}
                onChangeText={(value) => setNumberValue('protein', value)}
                error={errors.protein}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.columnField}>
              <TextInput
                label="Glucides (g)"
                value={numberValues.carbs}
                onChangeText={(value) => setNumberValue('carbs', value)}
                error={errors.carbs}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>

          <TextInput
            label="Lipides (g)"
            value={numberValues.fat}
            onChangeText={(value) => setNumberValue('fat', value)}
            error={errors.fat}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optionnel</Text>

          <View style={styles.twoColumns}>
            <View style={styles.columnField}>
              <TextInput
                label="Fibres (g)"
                value={numberValues.fiber}
                onChangeText={(value) => setNumberValue('fiber', value)}
                error={errors.fiber}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.columnField}>
              <TextInput
                label="Sucre (g)"
                value={numberValues.sugar}
                onChangeText={(value) => setNumberValue('sugar', value)}
                error={errors.sugar}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>

          <TextInput
            label="Sel (g)"
            value={numberValues.salt}
            onChangeText={(value) => setNumberValue('salt', value)}
            error={errors.salt}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>

        <Button title={submitLabel} onPress={handleSubmit} style={styles.submitButton} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoiding: { flex: 1 },
  content: { padding: 16, gap: 22, paddingBottom: 32 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  categoryBlock: { gap: 6 },
  fieldBlock: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  unitTextSelected: { color: colors.primaryText },
  twoColumns: { flexDirection: 'row', gap: 10 },
  columnField: { flex: 1, minWidth: 0 },
  submitButton: { marginTop: 4 },
});
