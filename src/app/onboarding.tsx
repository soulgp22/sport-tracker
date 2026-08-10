import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui/Button';
import { RetailerPicker } from '../components/community/RetailerPicker';
import { TextInput } from '../components/ui/TextInput';
import { LANGUAGE_OPTIONS, type LanguageId } from '../i18n/translations';
import { useTranslation } from '../i18n/useTranslation';
import { useCommunityStore } from '../store/communityStore';
import { useBodyWeightStore } from '../store/bodyWeightStore';
import { usePerformanceStore } from '../store/performanceStore';
import { getBodyweightForDate } from '../lib/performanceEngine';
import type { ActivityLevel, PerformanceSex } from '../types/performance';
import {
  useOnboardingStore,
  type OnboardingGoal,
  type OnboardingEquipmentProfileId,
  type OnboardingLevel,
  type OnboardingRetailer,
} from '../store/onboardingStore';
import { fonts } from '../theme/fonts';
import { radius, spacing } from '../theme/tokens';

import type { ThemeColors } from '../theme/palettes';
import { useColors } from '../theme/useColors';

const copy: Record<LanguageId, Record<string, string>> = {
  fr: { welcome: 'Construisons ton point de départ', intro: 'Quelques réponses suffisent pour adapter tes programmes, tes exercices et tes aliments.', language: 'Ta langue', goal: 'Quel est ton objectif principal ?', level: 'Quel est ton niveau actuel ?', rhythm: 'Comment vas-tu t’entraîner ?', profile: 'Ton profil', profileHelp: 'Optionnel — ces infos servent à estimer ta dépense quotidienne (bilan nutrition).', profileSex: 'Sexe', profileAge: 'Âge', profileHeight: 'Taille (cm)', profileWeight: 'Poids actuel (kg)', profileActivity: 'Niveau d’activité', nutrition: 'Personnalisons aussi la nutrition', next: 'Continuer', back: 'Retour', days: 'séances par semaine', equipment: 'Matériel disponible', retailer: 'Base d’aliments par pays', coreFoods: '142 aliments essentiels sont déjà disponibles hors ligne.' },
  en: { welcome: 'Build your starting point', intro: 'A few answers let us tailor programs, exercises and foods.', language: 'Your language', goal: 'What is your main goal?', level: 'What is your current level?', rhythm: 'How will you train?', profile: 'Your profile', profileHelp: 'Optional — used to estimate your daily energy burn (nutrition balance).', profileSex: 'Sex', profileAge: 'Age', profileHeight: 'Height (cm)', profileWeight: 'Current weight (kg)', profileActivity: 'Activity level', nutrition: 'Let’s tailor nutrition too', next: 'Continue', back: 'Back', days: 'sessions per week', equipment: 'Available equipment', retailer: 'Food database by country', coreFoods: '142 essential foods are already available offline.' },
  es: { welcome: 'Crea tu punto de partida', intro: 'Unas respuestas bastan para adaptar programas, ejercicios y alimentos.', language: 'Tu idioma', goal: '¿Cuál es tu objetivo principal?', level: '¿Cuál es tu nivel actual?', rhythm: '¿Cómo vas a entrenar?', profile: 'Tu perfil', profileHelp: 'Opcional — sirve para estimar tu gasto diario (balance de nutrición).', profileSex: 'Sexo', profileAge: 'Edad', profileHeight: 'Altura (cm)', profileWeight: 'Peso actual (kg)', profileActivity: 'Nivel de actividad', nutrition: 'Personalicemos también la nutrición', next: 'Continuar', back: 'Atrás', days: 'sesiones por semana', equipment: 'Equipo disponible', retailer: 'Base de alimentos por país', coreFoods: '142 alimentos esenciales ya están disponibles sin conexión.' },
  de: { welcome: 'Dein persönlicher Start', intro: 'Mit wenigen Antworten passen wir Programme, Übungen und Lebensmittel an.', language: 'Deine Sprache', goal: 'Was ist dein Hauptziel?', level: 'Wie ist dein aktuelles Niveau?', rhythm: 'Wie wirst du trainieren?', profile: 'Dein Profil', profileHelp: 'Optional — dient zur Schätzung deines täglichen Verbrauchs (Ernährungsbilanz).', profileSex: 'Geschlecht', profileAge: 'Alter', profileHeight: 'Größe (cm)', profileWeight: 'Aktuelles Gewicht (kg)', profileActivity: 'Aktivitätslevel', nutrition: 'Auch Ernährung personalisieren', next: 'Weiter', back: 'Zurück', days: 'Einheiten pro Woche', equipment: 'Verfügbare Geräte', retailer: 'Lebensmitteldatenbank nach Land', coreFoods: '142 wichtige Lebensmittel sind bereits offline verfügbar.' },
};

const retailerCopy: Record<LanguageId, Record<string, string>> = {
  fr: { placeholder: 'Choisir un pays', search: 'Rechercher un pays ou une enseigne', none: 'Aucune / plus tard', github: 'GitHub', close: 'Fermer', empty: 'Aucun pays trouvé' },
  en: { placeholder: 'Choose a country', search: 'Search a country or supermarket', none: 'None / later', github: 'GitHub', close: 'Close', empty: 'No country found' },
  es: { placeholder: 'Elegir un país', search: 'Buscar país o supermercado', none: 'Ninguno / más tarde', github: 'GitHub', close: 'Cerrar', empty: 'No se encontró ningún país' },
  de: { placeholder: 'Land auswählen', search: 'Land oder Supermarkt suchen', none: 'Keine / später', github: 'GitHub', close: 'Schließen', empty: 'Kein Land gefunden' },
};

type ChoiceLabelGroups = {
  goals: Record<OnboardingGoal, readonly [string, string]>;
  levels: Record<OnboardingLevel, readonly [string, string]>;
  equipmentProfiles: Record<OnboardingEquipmentProfileId, readonly [string, string]>;
  retailers: Record<OnboardingRetailer, readonly [string, string]>;
};

const labels: ChoiceLabelGroups = {
  goals: { muscle: ['barbell-outline', 'Prise de muscle'], strength: ['trending-up-outline', 'Force'], weight_loss: ['flame-outline', 'Perte de poids'], fitness: ['heart-outline', 'Forme & santé'] },
  levels: { beginner: ['sparkles-outline', 'Je débute'], intermediate: ['fitness-outline', 'Intermédiaire'], advanced: ['trophy-outline', 'Avancé'] },
  equipmentProfiles: {
    bodyweight: ['body-outline', 'Maison, sans matériel'],
    'home-basic': ['home-outline', 'Maison, petit matériel'],
    dumbbells: ['barbell-outline', 'Haltères uniquement'],
    machines: ['settings-outline', 'Machines uniquement'],
    barbell: ['fitness-outline', 'Barre et haltères'],
    'full-gym': ['business-outline', 'Salle complète'],
  },
  retailers: { auchan: ['basket-outline', 'Auchan France'], carrefour: ['cart-outline', 'Carrefour France'], none: ['remove-circle-outline', 'Aucune / plus tard'] },
};

const translatedLabels: Record<LanguageId, ChoiceLabelGroups> = {
  fr: labels,
  en: {
    goals: { muscle: ['barbell-outline', 'Build muscle'], strength: ['trending-up-outline', 'Strength'], weight_loss: ['flame-outline', 'Lose weight'], fitness: ['heart-outline', 'Fitness & health'] },
    levels: { beginner: ['sparkles-outline', 'I am starting'], intermediate: ['fitness-outline', 'Intermediate'], advanced: ['trophy-outline', 'Advanced'] },
    equipmentProfiles: {
      bodyweight: ['body-outline', 'Home, no equipment'],
      'home-basic': ['home-outline', 'Home, minimal kit'],
      dumbbells: ['barbell-outline', 'Dumbbells only'],
      machines: ['settings-outline', 'Machines only'],
      barbell: ['fitness-outline', 'Barbell & dumbbells'],
      'full-gym': ['business-outline', 'Full gym'],
    },
    retailers: { auchan: ['basket-outline', 'Auchan France'], carrefour: ['cart-outline', 'Carrefour France'], none: ['remove-circle-outline', 'None / later'] },
  },
  es: {
    goals: { muscle: ['barbell-outline', 'Ganar músculo'], strength: ['trending-up-outline', 'Fuerza'], weight_loss: ['flame-outline', 'Perder peso'], fitness: ['heart-outline', 'Forma y salud'] },
    levels: { beginner: ['sparkles-outline', 'Estoy empezando'], intermediate: ['fitness-outline', 'Intermedio'], advanced: ['trophy-outline', 'Avanzado'] },
    equipmentProfiles: {
      bodyweight: ['body-outline', 'Casa, sin material'],
      'home-basic': ['home-outline', 'Casa, equipo básico'],
      dumbbells: ['barbell-outline', 'Solo mancuernas'],
      machines: ['settings-outline', 'Solo máquinas'],
      barbell: ['fitness-outline', 'Barra y mancuernas'],
      'full-gym': ['business-outline', 'Gimnasio completo'],
    },
    retailers: { auchan: ['basket-outline', 'Auchan Francia'], carrefour: ['cart-outline', 'Carrefour Francia'], none: ['remove-circle-outline', 'Ninguno / más tarde'] },
  },
  de: {
    goals: { muscle: ['barbell-outline', 'Muskelaufbau'], strength: ['trending-up-outline', 'Kraft'], weight_loss: ['flame-outline', 'Gewicht verlieren'], fitness: ['heart-outline', 'Fitness & Gesundheit'] },
    levels: { beginner: ['sparkles-outline', 'Ich fange an'], intermediate: ['fitness-outline', 'Fortgeschritten'], advanced: ['trophy-outline', 'Sehr erfahren'] },
    equipmentProfiles: {
      bodyweight: ['body-outline', 'Zuhause, kein Gerät'],
      'home-basic': ['home-outline', 'Zuhause, kleines Set'],
      dumbbells: ['barbell-outline', 'Nur Kurzhanteln'],
      machines: ['settings-outline', 'Nur Maschinen'],
      barbell: ['fitness-outline', 'Lang- & Kurzhanteln'],
      'full-gym': ['business-outline', 'Vollständiges Studio'],
    },
    retailers: { auchan: ['basket-outline', 'Auchan Frankreich'], carrefour: ['cart-outline', 'Carrefour Frankreich'], none: ['remove-circle-outline', 'Keine / später'] },
  },
};

/** Poids saisi à l'onboarding : chiffres + un seul séparateur décimal (, ou .). */
function sanitizeWeightInput(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, '');
  const firstSeparator = cleaned.search(/[.,]/);
  if (firstSeparator === -1) return cleaned.slice(0, 6);
  const head = cleaned.slice(0, firstSeparator + 1);
  const tail = cleaned.slice(firstSeparator + 1).replace(/[.,]/g, '');
  return (head + tail).slice(0, 6);
}

function ChoiceGrid({ items, value, onChange }: { items: Record<string, readonly [string, string]>; value: string; onChange: (value: string) => void }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return <View style={styles.choiceGrid}>{Object.entries(items).map(([id, [icon, label]]) => {
    const selected = value === id;
    return <TouchableOpacity key={id} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.choice, selected && styles.choiceSelected]} onPress={() => onChange(id)} activeOpacity={0.78}>
      <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}><Ionicons name={icon as never} size={22} color={selected ? c.primaryText : c.primary} /></View>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
      {selected ? <Ionicons name="checkmark-circle" size={20} color={c.primary} /> : null}
    </TouchableOpacity>;
  })}</View>;
}

export default function OnboardingScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const text = copy[language];
  const options = translatedLabels[language];
  const profile = useOnboardingStore((state) => state.profile);
  const updateProfile = useOnboardingStore((state) => state.updateProfile);
  const complete = useOnboardingStore((state) => state.complete);
  const fetchManifest = useCommunityStore((state) => state.fetchManifest);
  const communityData = useCommunityStore((state) => state.data);
  const communityLoading = useCommunityStore((state) => state.loading);
  const performanceSex = usePerformanceStore((state) => state.sex);
  const performanceAge = usePerformanceStore((state) => state.age);
  const performanceHeightCm = usePerformanceStore((state) => state.heightCm);
  const performanceActivityLevel = usePerformanceStore((state) => state.activityLevel);
  const setPerformanceSex = usePerformanceStore((state) => state.setSex);
  const setPerformanceAge = usePerformanceStore((state) => state.setAge);
  const setPerformanceHeightCm = usePerformanceStore((state) => state.setHeightCm);
  const setPerformanceActivityLevel = usePerformanceStore((state) => state.setActivityLevel);
  const bodyWeightEntries = useBodyWeightStore((state) => state.entries);
  const addBodyWeightEntry = useBodyWeightStore((state) => state.addEntry);
  const [step, setStep] = useState(0);
  // Étape « Ton profil » : brouillons locaux, pré-remplis depuis les stores
  // (ré-injectés à l'entrée de l'étape car l'hydratation persist est asynchrone).
  const [profileSexDraft, setProfileSexDraft] = useState<PerformanceSex>(performanceSex);
  const [ageDraft, setAgeDraft] = useState(performanceAge ? String(performanceAge) : '');
  const [heightDraft, setHeightDraft] = useState(performanceHeightCm ? String(performanceHeightCm) : '');
  const [weightDraft, setWeightDraft] = useState('');
  const [activityDraft, setActivityDraft] = useState<ActivityLevel>(performanceActivityLevel);
  const [profileDraftsReady, setProfileDraftsReady] = useState(false);
  const totalSteps = 6;
  const retailerText = retailerCopy[language];
  // Anciens profils par enseigne : les bases starter Auchan/Carrefour ont été
  // retirées, la base pays France (97 aliments) couvre ces deux enseignes.
  const selectedFoodDatabaseId = profile.retailer === 'auchan' || profile.retailer === 'carrefour'
    ? 'foods-france'
    : profile.retailer === 'none' ? null : profile.retailer;
  useEffect(() => {
    if (step === 5 && !communityData && !communityLoading) {
      void fetchManifest();
    }
  }, [communityData, communityLoading, fetchManifest, step]);

  // Pré-remplissage du profil énergétique à l'entrée de l'étape (une seule
  // fois, pour ne pas écraser les saisies si l'utilisateur revient en arrière).
  useEffect(() => {
    if (step !== 4 || profileDraftsReady) return;
    setProfileSexDraft(performanceSex);
    setAgeDraft(performanceAge ? String(performanceAge) : '');
    setHeightDraft(performanceHeightCm ? String(performanceHeightCm) : '');
    const latestWeight = getBodyweightForDate(bodyWeightEntries, new Date().toISOString());
    setWeightDraft(latestWeight ? String(latestWeight).replace('.', ',') : '');
    setActivityDraft(performanceActivityLevel);
    setProfileDraftsReady(true);
  }, [
    step,
    profileDraftsReady,
    performanceSex,
    performanceAge,
    performanceHeightCm,
    performanceActivityLevel,
    bodyWeightEntries,
  ]);

  // Libellés du profil réutilisant les clés i18n existantes (déjà traduites).
  const sexChoices: { id: PerformanceSex; label: string }[] = [
    { id: 'female', label: t('performance.sexFemale') },
    { id: 'male', label: t('performance.sexMale') },
    { id: 'unspecified', label: t('performance.sexUnspecified') },
  ];
  const activityChoices: Record<string, readonly [string, string]> = {
    sedentary: ['walk-outline', t('performance.activity.sedentary')],
    light: ['bicycle-outline', t('performance.activity.light')],
    moderate: ['fitness-outline', t('performance.activity.moderate')],
    active: ['flame-outline', t('performance.activity.active')],
  };

  // Sauvegarde le profil énergétique au passage à l'étape suivante.
  // Champs optionnels : seules les valeurs saisies ET dans les bornes sont
  // enregistrées (les setters du store re-clampent de toute façon).
  const saveEnergyProfile = () => {
    setPerformanceSex(profileSexDraft);
    setPerformanceActivityLevel(activityDraft);
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
    if (step === 4) saveEnergyProfile();
    if (step === totalSteps - 1) {
      complete();
      router.replace('/(tabs)' as never);
      return;
    }
    setStep(step + 1);
  };

  const title = [text.welcome, text.goal, text.level, text.rhythm, text.profile, text.nutrition][step];
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.top}><View style={styles.progressTrack}><View style={[styles.progress, { width: `${((step + 1) / totalSteps) * 100}%` }]} /></View><Text style={styles.step}>{step + 1}/{totalSteps}</Text></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {step === 0 ? <View style={styles.heroIcon}><Ionicons name="pulse" size={40} color={c.primaryText} /></View> : null}
      <Text style={styles.eyebrow}>LIFE SPORT TRACKER</Text>
      <Text style={styles.title}>{title}</Text>
      {step === 0 ? <><Text style={styles.subtitle}>{text.intro}</Text><Text style={styles.sectionLabel}>{text.language}</Text><View style={styles.languageRow}>{LANGUAGE_OPTIONS.map((option) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: language === option.id }} key={option.id} style={[styles.language, language === option.id && styles.languageSelected]} onPress={() => setLanguage(option.id)}><Text style={[styles.languageText, language === option.id && styles.languageTextSelected]}>{option.id.toUpperCase()}</Text></TouchableOpacity>)}</View></> : null}
      {step === 1 ? <ChoiceGrid items={options.goals} value={profile.goal} onChange={(goal) => updateProfile({ goal: goal as OnboardingGoal })} /> : null}
      {step === 2 ? <ChoiceGrid items={options.levels} value={profile.level} onChange={(level) => updateProfile({ level: level as OnboardingLevel })} /> : null}
      {step === 3 ? <><Text style={styles.sectionLabel}>{text.days}</Text><View style={styles.daysRow}>{[2,3,4,5,6].map((days) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: profile.daysPerWeek === days }} key={days} style={[styles.day, profile.daysPerWeek === days && styles.daySelected]} onPress={() => updateProfile({ daysPerWeek: days })}><Text style={[styles.dayText, profile.daysPerWeek === days && styles.dayTextSelected]}>{days}</Text></TouchableOpacity>)}</View><Text style={styles.sectionLabel}>{text.equipment}</Text><ChoiceGrid items={options.equipmentProfiles} value={profile.equipmentProfileId} onChange={(equipmentProfileId) => updateProfile({ equipmentProfileId: equipmentProfileId as OnboardingEquipmentProfileId })} /></> : null}
      {step === 4 ? <>
        <Text style={styles.subtitle}>{text.profileHelp}</Text>
        <Text style={styles.sectionLabel}>{text.profileSex}</Text>
        <View style={styles.languageRow}>{sexChoices.map((option) => {
          const selected = profileSexDraft === option.id;
          return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected }} key={option.id} style={[styles.language, selected && styles.languageSelected]} onPress={() => setProfileSexDraft(option.id)}><Text style={[styles.profileSexText, selected && styles.languageTextSelected]} numberOfLines={1}>{option.label}</Text></TouchableOpacity>;
        })}</View>
        <View style={styles.profileFields}>
          <TextInput label={text.profileAge} value={ageDraft} onChangeText={(value) => setAgeDraft(value.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" maxLength={3} placeholder="30" />
          <TextInput label={text.profileHeight} value={heightDraft} onChangeText={(value) => setHeightDraft(value.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" maxLength={3} placeholder="175" />
          <TextInput label={text.profileWeight} value={weightDraft} onChangeText={(value) => setWeightDraft(sanitizeWeightInput(value))} keyboardType="decimal-pad" placeholder="70" />
        </View>
        <Text style={styles.sectionLabel}>{text.profileActivity}</Text>
        <ChoiceGrid items={activityChoices} value={activityDraft} onChange={(id) => setActivityDraft(id as ActivityLevel)} />
      </> : null}
      {step === 5 ? <><Text style={styles.subtitle}>{text.coreFoods}</Text><RetailerPicker entries={communityData?.foodDatabases ?? []} value={selectedFoodDatabaseId} loading={communityLoading} label={text.retailer} placeholder={retailerText.placeholder} searchPlaceholder={retailerText.search} noneLabel={retailerText.none} githubLabel={retailerText.github} closeLabel={retailerText.close} emptyLabel={retailerText.empty} onChange={(id) => updateProfile({ retailer: id ?? 'none' })} onRefresh={() => void fetchManifest()} /></> : null}
    </ScrollView>
    <View style={styles.footer}>{step > 0 ? <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => setStep(step - 1)}><Ionicons name="arrow-back" size={20} color={c.textPrimary} /><Text style={styles.backText}>{text.back}</Text></TouchableOpacity> : <View />}<Button title={text.next} onPress={goNext} style={styles.nextButton} /></View>
  </SafeAreaView>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg }, top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: 8 }, progressTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: c.surfaceAlt }, progress: { height: '100%', borderRadius: 3, backgroundColor: c.primary }, step: { fontFamily: fonts.sansBold, color: c.textMuted, fontSize: 12 }, content: { padding: spacing.lg, paddingTop: 30, paddingBottom: 20 }, heroIcon: { width: 72, height: 72, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary, marginBottom: 26 }, eyebrow: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.8, color: c.primary, marginBottom: 10 }, title: { fontFamily: fonts.sansHeavy, fontSize: 32, lineHeight: 37, color: c.textPrimary, marginBottom: 12 }, subtitle: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: c.textSecondary, marginBottom: 28 }, sectionLabel: { fontFamily: fonts.sansBold, fontSize: 13, color: c.textPrimary, marginTop: spacing.md, marginBottom: 11 }, languageRow: { flexDirection: 'row', gap: 9 }, language: { flex: 1, minHeight: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }, languageSelected: { backgroundColor: c.primary, borderColor: c.primary }, languageText: { fontFamily: fonts.sansBold, color: c.textPrimary }, languageTextSelected: { color: c.primaryText }, choiceGrid: { gap: spacing.sm, marginTop: 12 }, choice: { minHeight: 68, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 12 }, choiceSelected: { borderColor: c.primary, backgroundColor: c.accentSoft }, choiceIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft }, choiceIconSelected: { backgroundColor: c.primary }, choiceText: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 16, color: c.textPrimary }, choiceTextSelected: { fontFamily: fonts.sansBold }, daysRow: { flexDirection: 'row', gap: 9, marginBottom: 18 }, day: { flex: 1, aspectRatio: 1, maxHeight: 58, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }, daySelected: { backgroundColor: c.primary, borderColor: c.primary }, dayText: { fontFamily: fonts.sansBold, fontSize: 18, color: c.textPrimary }, dayTextSelected: { color: c.primaryText }, footer: { minHeight: 80, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface }, backButton: { flexDirection: 'row', gap: 7, minHeight: 42, alignItems: 'center', paddingHorizontal: 8 }, backText: { fontFamily: fonts.sansSemi, color: c.textPrimary }, nextButton: { minWidth: 150 }, profileFields: { gap: spacing.sm, marginTop: 16 }, profileSexText: { fontFamily: fonts.sansBold, fontSize: 12, color: c.textPrimary },
});
