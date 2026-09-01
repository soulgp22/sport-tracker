import { createContext, useContext, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/TextInput';
import { MEAL_ORDER, mealTypeLabel } from '../../../constants/meals';
import { keyboardAvoidingBehavior, keyboardVerticalOffset } from '../../../constants/keyboard';
import { useTranslation } from '../../../i18n/useTranslation';
import { useColors } from '../../../theme/useColors';
import type { ThemeColors } from '../../../theme/palettes';
import { fonts } from '../../../theme/fonts';
import { radius, spacing } from '../../../theme/tokens';
import type { MealType } from '../../../types';

/** Repli pour les environnements où SafeAreaInsetsContext n'est pas fourni
 *  (ex. mock Jest de react-native-safe-area-context sans ce contexte). */
const fallbackInsetsContext = createContext<EdgeInsets | null>(null);

interface QuickCaloriesModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { calories: number; mealType: MealType; label: string }) => void;
}

/** Accepte uniquement un entier strictement positif, sans virgule ni signe. */
function parseCalories(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * Saisie « ajout rapide de calories » : un montant calorique, un type de repas
 * (réutilise MEAL_ORDER / mealTypeLabel) et un libellé optionnel. La modale est
 * volontairement présentationaliste : le parent construit et écrit le FoodEntry.
 */
export function QuickCaloriesModal({ visible, onClose, onSubmit }: QuickCaloriesModalProps) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  // Même mécanisme que AppDialog : dans une Modal Android
  // (navigationBarTranslucent), l'inset bas peut être nul. On le lit
  // explicitement pour compenser la barre de navigation (repli 0 si absent).
  const insets = useContext(SafeAreaInsetsContext ?? fallbackInsetsContext);
  const bottomInset = insets?.bottom ?? 0;
  const [calories, setCalories] = useState('');
  const [mealType, setMealType] = useState<MealType>(MEAL_ORDER[0]);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const resetForm = () => {
    setCalories('');
    setMealType(MEAL_ORDER[0]);
    setLabel('');
    setError(undefined);
  };

  const close = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    const parsed = parseCalories(calories);
    if (parsed === null) {
      setError(t('nutrition.quickAdd.invalidCalories'));
      return;
    }
    onSubmit({ calories: parsed, mealType, label: label.trim() });
    resetForm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={keyboardAvoidingBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.safe, { paddingBottom: bottomInset }]} pointerEvents="box-none">
          <View style={styles.card} accessibilityRole="alert" testID="quick-calories-dialog">
            <View style={styles.grabber} />
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>{t('nav.nutrition')}</Text>
                <Text style={styles.title}>{t('nutrition.quickAdd.title')}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={close}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}>
                <Ionicons name="close" size={20} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <TextInput
                  label={t('nutrition.quickAdd.calories')}
                  placeholder={t('nutrition.quickAdd.caloriesPlaceholder')}
                  value={calories}
                  onChangeText={(value) => {
                    setCalories(value);
                    setError(undefined);
                  }}
                  keyboardType="number-pad"
                  testID="quick-calories-input"
                  error={error}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t('nutrition.add.mealType')}</Text>
                <View style={styles.chipRow}>
                  {MEAL_ORDER.map((value) => {
                    const selected = value === mealType;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setMealType(value)}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={mealTypeLabel(value, t)}
                        accessibilityState={{ selected }}>
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {mealTypeLabel(value, t)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <TextInput
                  label={t('nutrition.quickAdd.label')}
                  placeholder={t('nutrition.quickAdd.labelPlaceholder')}
                  value={label}
                  onChangeText={setLabel}
                  maxLength={40}
                  testID="quick-calories-label"
                />
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Button title={t('common.add')} onPress={handleSubmit} style={styles.actionButton} />
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={close}
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay },
    safe: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
    card: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 20,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      shadowColor: '#000000',
      shadowOpacity: 0.24,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 18,
    },
    grabber: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginBottom: 18,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerCopy: { flex: 1 },
    eyebrow: { fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 1.4, color: c.primary, marginBottom: 3 },
    title: { fontFamily: fonts.sansBold, fontSize: 19, lineHeight: 23, color: c.textPrimary },
    closeButton: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
    },
    body: { marginTop: 16, flexGrow: 0 },
    field: { gap: spacing.xs, marginBottom: spacing.sm },
    fieldLabel: { fontFamily: fonts.sansSemi, fontSize: 14, color: c.textPrimary },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipSelected: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontFamily: fonts.sansBold, fontSize: 13, color: c.textPrimary },
    chipTextSelected: { color: c.primaryText },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    actionButton: { flex: 1 },
  });

