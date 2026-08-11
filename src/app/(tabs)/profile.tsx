import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { TextInput } from '../../components/ui/TextInput';
import { useColors } from '../../theme/useColors';
import { useTranslation } from '../../i18n/useTranslation';
import { usePerformanceStore } from '../../store/performanceStore';
import { useBodyWeightStore } from '../../store/bodyWeightStore';
import { getBodyweightForDate } from '../../lib/performanceEngine';
import { sanitizeWeightInput } from '../../lib/sanitizeWeightInput';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';

import type { ThemeColors } from '../../theme/palettes';
import type { PerformanceSex } from '../../types/performance';

const SEX_OPTIONS: { id: PerformanceSex; labelKey: string }[] = [
  { id: 'unspecified', labelKey: 'performance.sexUnspecified' },
  { id: 'female', labelKey: 'performance.sexFemale' },
  { id: 'male', labelKey: 'performance.sexMale' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);

  const sex = usePerformanceStore((s) => s.sex);
  const setSex = usePerformanceStore((s) => s.setSex);
  const age = usePerformanceStore((s) => s.age);
  const setAge = usePerformanceStore((s) => s.setAge);
  const heightCm = usePerformanceStore((s) => s.heightCm);
  const setHeightCm = usePerformanceStore((s) => s.setHeightCm);
  const firstName = usePerformanceStore((s) => s.firstName);
  const setFirstName = usePerformanceStore((s) => s.setFirstName);
  const lastName = usePerformanceStore((s) => s.lastName);
  const setLastName = usePerformanceStore((s) => s.setLastName);

  const bodyWeightEntries = useBodyWeightStore((s) => s.entries);
  const addBodyWeightEntry = useBodyWeightStore((s) => s.addEntry);

  const [firstNameDraft, setFirstNameDraft] = useState<string | null>(null);
  const [lastNameDraft, setLastNameDraft] = useState<string | null>(null);
  const [ageDraft, setAgeDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);
  const [weightDraft, setWeightDraft] = useState<string | null>(null);

  const firstNameValue = firstNameDraft ?? (firstName ?? '');
  const lastNameValue = lastNameDraft ?? (lastName ?? '');
  const ageInput = ageDraft ?? (age ? String(age) : '');
  const heightInput = heightDraft ?? (heightCm ? String(heightCm) : '');
  const latestWeight = getBodyweightForDate(bodyWeightEntries, new Date().toISOString());
  const weightInput = weightDraft ?? (latestWeight ? String(latestWeight).replace('.', ',') : '');

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)' as never);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={8}
          activeOpacity={0.7}
          accessibilityLabel={t('profile.backAccessibilityLabel')}>
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.heading}>{t('profile.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.helpText}>{t('profile.help')}</Text>

          <TextInput
            label={t('profile.firstName')}
            value={firstNameValue}
            onChangeText={(value) => setFirstNameDraft(value)}
            onEndEditing={() => {
              setFirstName(firstNameDraft?.trim() || undefined);
              setFirstNameDraft(null);
            }}
            maxLength={60}
          />

          <TextInput
            label={t('profile.lastName')}
            value={lastNameValue}
            onChangeText={(value) => setLastNameDraft(value)}
            onEndEditing={() => {
              setLastName(lastNameDraft?.trim() || undefined);
              setLastNameDraft(null);
            }}
            maxLength={60}
          />

          <Text style={styles.fieldLabel}>{t('performance.sex')}</Text>
          <View style={styles.choiceRow}>
            {SEX_OPTIONS.map((option) => {
              const checked = sex === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.choiceChip, checked ? styles.choiceChipActive : null]}
                  onPress={() => setSex(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}>
                  <Text style={[styles.choiceText, checked ? styles.choiceTextActive : null]}>
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            label={t('performance.age')}
            value={ageInput}
            onChangeText={(value) => setAgeDraft(value.replace(/\D/g, '').slice(0, 3))}
            onEndEditing={() => {
              setAge(ageInput ? Number(ageInput) : undefined);
              setAgeDraft(null);
            }}
            keyboardType="number-pad"
            maxLength={3}
            placeholder={t('performance.agePlaceholder')}
          />

          <TextInput
            label={t('performance.height')}
            value={heightInput}
            onChangeText={(value) => setHeightDraft(value.replace(/\D/g, '').slice(0, 3))}
            onEndEditing={() => {
              setHeightCm(heightInput ? Number(heightInput) : undefined);
              setHeightDraft(null);
            }}
            keyboardType="number-pad"
            maxLength={3}
            placeholder={t('performance.heightPlaceholder')}
          />

          <TextInput
            label={t('profile.weight')}
            value={weightInput}
            onChangeText={(value) => setWeightDraft(sanitizeWeightInput(value))}
            onEndEditing={() => {
              const raw = weightDraft ?? '';
              const normalized = raw.replace(',', '.');
              const parsed = parseFloat(normalized);
              if (raw.trim() && Number.isFinite(parsed) && parsed >= 30 && parsed <= 300) {
                addBodyWeightEntry(parsed);
              }
              setWeightDraft(null);
            }}
            keyboardType="decimal-pad"
            placeholder={t('profile.weightPlaceholder')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.bg,
    },
    headerSpacer: { width: 24 },
    heading: {
      fontSize: 17,
      fontFamily: fonts.sansBold,
      color: c.textPrimary,
    },
    content: { padding: spacing.md, gap: spacing.xl, paddingBottom: 40 },
    section: { gap: 12 },
    helpText: {
      fontSize: 13,
      fontFamily: fonts.sans,
      color: c.textSecondary,
      lineHeight: 18,
    },
    fieldLabel: {
      fontSize: 13,
      fontFamily: fonts.sansSemi,
      color: c.textPrimary,
    },
    choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choiceChip: {
      minHeight: 38,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    choiceChipActive: {
      borderColor: c.primary,
      backgroundColor: c.accentSoft,
    },
    choiceText: {
      fontSize: 12,
      fontFamily: fonts.sansSemi,
      color: c.textSecondary,
    },
    choiceTextActive: { color: c.primary },
  });