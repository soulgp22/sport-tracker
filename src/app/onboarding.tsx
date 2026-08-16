import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { LANGUAGE_OPTIONS, type LanguageId } from '../i18n/translations';
import { useTranslation } from '../i18n/useTranslation';
import { useBodyWeightStore } from '../store/bodyWeightStore';
import { usePerformanceStore } from '../store/performanceStore';
import { getBodyweightForDate } from '../lib/performanceEngine';
import { sanitizeWeightInput } from '../lib/sanitizeWeightInput';
import { useOnboardingStore } from '../store/onboardingStore';
import { fonts } from '../theme/fonts';
import { radius, spacing } from '../theme/tokens';

import type { ThemeColors } from '../theme/palettes';
import { useColors } from '../theme/useColors';

const copy: Record<LanguageId, Record<string, string>> = {
  fr: { welcome: 'Construisons ton point de départ', intro: 'Quelques réponses suffisent pour adapter tes programmes, tes exercices et tes aliments.', language: 'Ta langue', profile: 'Ton profil', profileFirstName: 'Prénom', profileHelp: 'Optionnel — ces infos servent à estimer ta dépense quotidienne (bilan nutrition).', profileAge: 'Âge', profileHeight: 'Taille (cm)', profileWeight: 'Poids actuel (kg)', next: 'Continuer', back: 'Retour' },
  en: { welcome: 'Build your starting point', intro: 'A few answers let us tailor programs, exercises and foods.', language: 'Your language', profile: 'Your profile', profileFirstName: 'First name', profileHelp: 'Optional — used to estimate your daily energy burn (nutrition balance).', profileAge: 'Age', profileHeight: 'Height (cm)', profileWeight: 'Current weight (kg)', next: 'Continue', back: 'Back' },
  es: { welcome: 'Crea tu punto de partida', intro: 'Unas respuestas bastan para adaptar programas, ejercicios y alimentos.', language: 'Tu idioma', profile: 'Tu perfil', profileFirstName: 'Nombre', profileHelp: 'Opcional — sirve para estimar tu gasto diario (balance de nutrición).', profileAge: 'Edad', profileHeight: 'Altura (cm)', profileWeight: 'Peso actual (kg)', next: 'Continuar', back: 'Atrás' },
  de: { welcome: 'Dein persönlicher Start', intro: 'Mit wenigen Antworten passen wir Programme, Übungen und Lebensmittel an.', language: 'Deine Sprache', profile: 'Dein Profil', profileFirstName: 'Vorname', profileHelp: 'Optional — dient zur Schätzung deines täglichen Verbrauchs (Ernährungsbilanz).', profileAge: 'Alter', profileHeight: 'Größe (cm)', profileWeight: 'Aktuelles Gewicht (kg)', next: 'Weiter', back: 'Zurück' },
};

export default function OnboardingScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { language, setLanguage } = useTranslation();
  const text = copy[language];
  const complete = useOnboardingStore((state) => state.complete);
  const performanceAge = usePerformanceStore((state) => state.age);
  const performanceHeightCm = usePerformanceStore((state) => state.heightCm);
  const performanceFirstName = usePerformanceStore((state) => state.firstName);
  const setPerformanceAge = usePerformanceStore((state) => state.setAge);
  const setPerformanceHeightCm = usePerformanceStore((state) => state.setHeightCm);
  const setPerformanceFirstName = usePerformanceStore((state) => state.setFirstName);
  const bodyWeightEntries = useBodyWeightStore((state) => state.entries);
  const addBodyWeightEntry = useBodyWeightStore((state) => state.addEntry);
  const [step, setStep] = useState(0);
  // Brouillons locaux, pré-remplis depuis les stores
  const [ageDraft, setAgeDraft] = useState('');
  const [heightDraft, setHeightDraft] = useState('');
  const [weightDraft, setWeightDraft] = useState('');
  const [firstNameDraft, setFirstNameDraft] = useState('');
  const totalSteps = 2;
  const [profileDraftsReady, setProfileDraftsReady] = useState(false);

  // Pré-remplissage du profil énergétique à l'entrée de l'étape (une seule
  // fois, pour ne pas écraser les saisies si l'utilisateur revient en arrière).
  useEffect(() => {
    if (step !== 1 || profileDraftsReady) return;
    setAgeDraft(performanceAge ? String(performanceAge) : '');
    setHeightDraft(performanceHeightCm ? String(performanceHeightCm) : '');
    setFirstNameDraft(performanceFirstName ?? '');
    const latestWeight = getBodyweightForDate(bodyWeightEntries, new Date().toISOString());
    setWeightDraft(latestWeight ? String(latestWeight).replace('.', ',') : '');
    setProfileDraftsReady(true);
  }, [step, profileDraftsReady, performanceAge, performanceHeightCm, performanceFirstName, bodyWeightEntries]);

  // Sauvegarde le profil énergétique au passage à l'étape suivante.
  const saveEnergyProfile = () => {
    setPerformanceFirstName(firstNameDraft);
    const parsedAge = parseInt(ageDraft, 10);
    if (ageDraft.trim() && Number.isFinite(parsedAge) && parsedAge >= 10 && parsedAge <= 100) {
      setPerformanceAge(parsedAge);
    }
    const parsedHeight = parseInt(heightDraft, 10);
    if (heightDraft.trim() && Number.isFinite(parsedHeight) && parsedHeight >= 100 && parsedHeight <= 250) {
      setPerformanceHeightCm(parsedHeight);
    }
    const parsedWeight = parseFloat(weightDraft.replace(',', '.'));
    if (weightDraft.trim() && Number.isFinite(parsedWeight) && parsedWeight >= 30 && parsedWeight <= 300) {
      addBodyWeightEntry(parsedWeight);
    }
  };

  const goNext = () => {
    if (step === 1) saveEnergyProfile();
    if (step === totalSteps - 1) {
      complete();
      router.replace('/(tabs)' as never);
      return;
    }
    setStep(step + 1);
  };

  const title = [text.welcome, text.profile][step];
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.top}><View style={styles.progressTrack}><View style={[styles.progress, { width: `${((step + 1) / totalSteps) * 100}%` }]} /></View><Text style={styles.step}>{step + 1}/{totalSteps}</Text></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {step === 0 ? <View style={styles.heroIcon}><Ionicons name="pulse" size={40} color={c.primaryText} /></View> : null}
      <Text style={styles.eyebrow}>LIFE SPORT TRACKER</Text>
      <Text style={styles.title}>{title}</Text>
      {step === 0 ? <><Text style={styles.subtitle}>{text.intro}</Text><Text style={styles.sectionLabel}>{text.language}</Text><View style={styles.languageRow}>{LANGUAGE_OPTIONS.map((option) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: language === option.id }} key={option.id} style={[styles.language, language === option.id && styles.languageSelected]} onPress={() => setLanguage(option.id)}><Text style={[styles.languageText, language === option.id && styles.languageTextSelected]}>{option.id.toUpperCase()}</Text></TouchableOpacity>)}</View></> : null}
      {step === 1 ? <>
        <Text style={styles.subtitle}>{text.profileHelp}</Text>
        <View style={styles.profileFields}>
          <TextInput
            label={text.profileFirstName}
            value={firstNameDraft}
            onChangeText={setFirstNameDraft}
            maxLength={60}
            autoCapitalize="words"
            placeholder="Marc"
          />
          <TextInput label={text.profileAge} value={ageDraft} onChangeText={(value) => setAgeDraft(value.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" maxLength={3} placeholder="30" />
          <TextInput label={text.profileHeight} value={heightDraft} onChangeText={(value) => setHeightDraft(value.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" maxLength={3} placeholder="175" />
          <TextInput label={text.profileWeight} value={weightDraft} onChangeText={(value) => setWeightDraft(sanitizeWeightInput(value))} keyboardType="decimal-pad" placeholder="70" />
        </View>
      </> : null}
    </ScrollView>
    <View style={styles.footer}>{step > 0 ? <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => setStep(step - 1)}><Ionicons name="arrow-back" size={20} color={c.textPrimary} /><Text style={styles.backText}>{text.back}</Text></TouchableOpacity> : <View />}<Button title={text.next} onPress={goNext} style={styles.nextButton} /></View>
  </SafeAreaView>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: 8 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: c.surfaceAlt },
  progress: { height: '100%', borderRadius: 3, backgroundColor: c.primary },
  step: { fontFamily: fonts.sansBold, color: c.textMuted, fontSize: 12 },
  content: { padding: spacing.lg, paddingTop: 30, paddingBottom: 20 },
  heroIcon: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary, marginBottom: 26 },
  eyebrow: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.8, color: c.primary, marginBottom: 10 },
  title: { fontFamily: fonts.sansHeavy, fontSize: 32, lineHeight: 37, color: c.textPrimary, marginBottom: 12 },
  subtitle: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: c.textSecondary, marginBottom: 28 },
  sectionLabel: { fontFamily: fonts.sansBold, fontSize: 13, color: c.textPrimary, marginTop: spacing.md, marginBottom: 11 },
  languageRow: { flexDirection: 'row', gap: 9 },
  language: { flex: 1, minHeight: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  languageSelected: { backgroundColor: c.primary, borderColor: c.primary },
  languageText: { fontFamily: fonts.sansBold, color: c.textPrimary },
  languageTextSelected: { color: c.primaryText },
  profileFields: { gap: spacing.sm, marginTop: 16 },
  footer: { minHeight: 80, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface },
  backButton: { flexDirection: 'row', gap: 7, minHeight: 42, alignItems: 'center', paddingHorizontal: 8 },
  backText: { fontFamily: fonts.sansSemi, color: c.textPrimary },
  nextButton: { minWidth: 120 },
});
