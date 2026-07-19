import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../constants/keyboard';
import { Button } from '../ui/Button';
import { TextInput } from '../ui/TextInput';
import { CategoryChips } from './CategoryChips';
import type { Food, FoodNutrition, FoodUnit } from '../../types';
import { useTranslation } from '../../i18n/useTranslation';

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

function labelForNumberField(
  field: (typeof requiredNumberFields)[number] | (typeof optionalNumberFields)[number],
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  switch (field) {
    case 'calories':
      return t('nutrition.form.calories');
    case 'protein':
      return t('nutrition.form.protein');
    case 'carbs':
      return t('nutrition.form.carbs');
    case 'fat':
      return t('nutrition.form.fat');
    case 'fiber':
      return t('nutrition.form.fiber');
    case 'sugar':
      return t('nutrition.form.sugar');
    case 'salt':
      return t('nutrition.form.salt');
  }
}

function nutritionTitle(
  unit: FoodUnit,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  if (unit === 'g' || unit === 'ml') return t('nutrition.form.per100', { unit });
  if (unit === 'unité') return t('nutrition.form.perUnit', { unit: 'unité' });
  return t('nutrition.form.perUnit', { unit: 'portion' });
}

export function FoodForm({ initialFood, categories, submitLabel, onSubmit }: FoodFormProps) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
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
      const label = labelForNumberField(field, t);

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

      const label = labelForNumberField(field, t);
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
              label={t('nutrition.form.category')}
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
            <Text style={styles.label}>{t('nutrition.form.unit')}</Text>
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
          <Text style={styles.sectionTitle}>{nutritionTitle(unit, t)}</Text>

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
                label={t('nutrition.form.protein')}
                value={numberValues.protein}
                onChangeText={(value) => setNumberValue('protein', value)}
                error={errors.protein}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.columnField}>
              <TextInput
                label={t('nutrition.form.carbs')}
                value={numberValues.carbs}
                onChangeText={(value) => setNumberValue('carbs', value)}
                error={errors.carbs}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>

          <TextInput
            label={t('nutrition.form.fat')}
            value={numberValues.fat}
            onChangeText={(value) => setNumberValue('fat', value)}
            error={errors.fat}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('nutrition.form.optional')}</Text>

          <View style={styles.twoColumns}>
            <View style={styles.columnField}>
              <TextInput
                label={t('nutrition.form.fiber')}
                value={numberValues.fiber}
                onChangeText={(value) => setNumberValue('fiber', value)}
                error={errors.fiber}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.columnField}>
              <TextInput
                label={t('nutrition.form.sugar')}
                value={numberValues.sugar}
                onChangeText={(value) => setNumberValue('sugar', value)}
                error={errors.sugar}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>

          <TextInput
            label={t('nutrition.form.salt')}
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
  categoryBlock: { gap: 6 },
  fieldBlock: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: c.textPrimary },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  unitChipSelected: { backgroundColor: c.primary, borderColor: c.primary },
  unitText: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
  unitTextSelected: { color: c.primaryText },
  twoColumns: { flexDirection: 'row', gap: 10 },
  columnField: { flex: 1, minWidth: 0 },
  submitButton: { marginTop: 4 },
});
