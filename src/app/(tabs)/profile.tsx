import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { appAlert } from '../../components/ui/AppDialog';
import { TextInput } from '../../components/ui/TextInput';
import { useColors } from '../../theme/useColors';
import { useTranslation } from '../../i18n/useTranslation';
import { useOnboardingStore } from '../../store/onboardingStore';
import { usePerformanceStore } from '../../store/performanceStore';
import { fonts } from '../../theme/fonts';

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
  const restartOnboarding = useOnboardingStore((s) => s.restart);

  const [firstNameDraft, setFirstNameDraft] = useState<string | null>(null);
  const [lastNameDraft, setLastNameDraft] = useState<string | null>(null);
  const [ageDraft, setAgeDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);

  const firstNameValue = firstNameDraft ?? (firstName ?? '');
  const lastNameValue = lastNameDraft ?? (lastName ?? '');
  const ageInput = ageDraft ?? (age ? String(age) : '');
  const heightInput = heightDraft ?? (heightCm ? String(heightCm) : '');

  const fullName = [firstNameValue, lastNameValue].filter((part) => part.length > 0).join(' ');

  const handleRedoOnboarding = () => {
    appAlert(
      t('settings.redoOnboarding'),
      t('profile.redoOnboardingWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.redoOnboarding'),
          style: 'destructive',
          onPress: () => {
            restartOnboarding();
            router.replace('/onboarding' as never);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerKicker}>{t('nav.profile')}</Text>
        </View>
        <Text style={styles.headerTitle}>{fullName || t('profile.title')}</Text>
        <Text style={styles.helpText}>{t('profile.help')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View>
          <View style={styles.fieldRow}>
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
          </View>

          <View style={styles.fieldRow}>
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
          </View>

          <View style={styles.fieldRow}>
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
          </View>

          <View style={styles.fieldRow}>
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
          </View>

          <View style={styles.fieldRow}>
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
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionKicker}>{t('profile.settingsSection')}</Text>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/nutrition/goals' as never)}
            activeOpacity={0.7}
            accessibilityRole="button">
            <Text style={styles.settingLabel}>{t('profile.goals')}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/settings' as never)}
            activeOpacity={0.7}
            accessibilityRole="button">
            <Text style={styles.settingLabel}>{t('settings.appearance')}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/programs' as never)}
            activeOpacity={0.7}
            accessibilityRole="button">
            <Text style={styles.settingLabel}>{t('nav.programs')}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/history' as never)}
            activeOpacity={0.7}
            accessibilityRole="button">
            <Text style={styles.settingLabel}>{t('nav.history')}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/(tabs)/settings' as never)}
            activeOpacity={0.7}
            accessibilityRole="button">
            <Text style={styles.settingLabel}>{t('profile.backup')}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleRedoOnboarding}
            activeOpacity={0.7}
            accessibilityRole="button">
            <Text style={styles.settingLabel}>{t('settings.redoOnboarding')}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t('profile.version')}</Text>
            <Text style={[styles.settingLabel, { color: c.textMuted }]}>
              {Constants.expoConfig?.version ?? '?'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    header: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 16,
      borderBottomWidth: 2,
      borderBottomColor: c.border,
      backgroundColor: c.bg,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 10,
    },
    headerKicker: {
      fontFamily: fonts.serifBold,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 1.54,
      textTransform: 'uppercase',
      color: c.secondary,
    },
    headerTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 26,
      lineHeight: 32,
      color: c.textPrimary,
    },
    helpText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 6,
      color: c.textSecondary,
    },
    content: { paddingBottom: 40 },
    fieldRow: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      minHeight: 58,
    },
    fieldLabel: {
      fontFamily: fonts.sansSemi,
      fontSize: 14,
      color: c.textPrimary,
    },
    choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    choiceChip: {
      minHeight: 38,
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    choiceChipActive: {
      borderColor: c.primary,
      backgroundColor: c.accentSoft,
    },
    choiceText: {
      fontFamily: fonts.sansSemi,
      fontSize: 12,
      color: c.textSecondary,
    },
    choiceTextActive: { color: c.primary },
    settingsSection: {
      paddingTop: 18,
      borderTopWidth: 2,
      borderTopColor: c.border,
      paddingBottom: 24,
    },
    sectionKicker: {
      fontFamily: fonts.serifBold,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 1.54,
      textTransform: 'uppercase',
      color: c.secondary,
      marginHorizontal: 20,
      marginBottom: 8,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      minHeight: 56,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    settingLabel: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: c.textPrimary,
    },
  });