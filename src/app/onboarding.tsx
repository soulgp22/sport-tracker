import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/ui/Button';
import { appAlert } from '../components/ui/AppDialog';
import { RetailerPicker } from '../components/community/RetailerPicker';
import { LANGUAGE_OPTIONS, type LanguageId } from '../i18n/translations';
import { useTranslation } from '../i18n/useTranslation';
import { useCommunityStore } from '../store/communityStore';
import {
  useOnboardingStore,
  type OnboardingGoal,
  type OnboardingEquipmentProfileId,
  type OnboardingLevel,
  type OnboardingRetailer,
} from '../store/onboardingStore';
import { fonts } from '../theme/fonts';
import type { ThemeColors } from '../theme/palettes';
import { useColors } from '../theme/useColors';

const copy: Record<LanguageId, Record<string, string>> = {
  fr: { welcome: 'Construisons ton point de d·part', intro: 'Quelques r·ponses suffisent pour adapter tes programmes, tes exercices et tes aliments.', language: 'Ta langue', goal: 'Quel est ton objectif principal ?', level: 'Quel est ton niveau actuel ?', rhythm: 'Comment vas-tu t·entra·ner ?', nutrition: 'Personnalisons aussi la nutrition', result: 'Ton espace est pr·t', resultHelp: 'Voici les contenus conseill·s. Tu peux les t·l·charger maintenant ou plus tard.', next: 'Continuer', back: 'Retour', finish: 'Installer ma s·lection', skip: 'Commencer sans t·l·chargement', downloading: 'Installation de tes contenus·', days: 's·ances par semaine', equipment: 'Matériel disponible', retailer: 'Base d·aliments par pays', coreFoods: '142 aliments essentiels sont d·j· disponibles hors ligne.', recommended: 'Programme conseill· · GitHub', catalog: 'Catalogue complet', extraExercises: '851 exercices suppl·mentaires' },
  en: { welcome: 'Build your starting point', intro: 'A few answers let us tailor programs, exercises and foods.', language: 'Your language', goal: 'What is your main goal?', level: 'What is your current level?', rhythm: 'How will you train?', nutrition: 'Let·s tailor nutrition too', result: 'Your space is ready', resultHelp: 'These are your recommended downloads. Get them now or anytime later.', next: 'Continue', back: 'Back', finish: 'Install my selection', skip: 'Start without downloads', downloading: 'Installing your content·', days: 'sessions per week', equipment: 'Available equipment', retailer: 'Food database by country', coreFoods: '142 essential foods are already available offline.', recommended: 'Recommended program · GitHub', catalog: 'Full exercise catalog', extraExercises: '851 extra exercises' },
  es: { welcome: 'Crea tu punto de partida', intro: 'Unas respuestas bastan para adaptar programas, ejercicios y alimentos.', language: 'Tu idioma', goal: '·Cu·l es tu objetivo principal?', level: '·Cu·l es tu nivel actual?', rhythm: '·C·mo vas a entrenar?', nutrition: 'Personalicemos tambi·n la nutrici·n', result: 'Tu espacio est· listo', resultHelp: 'Estas son tus descargas recomendadas. Puedes instalarlas ahora o m·s tarde.', next: 'Continuar', back: 'Atr·s', finish: 'Instalar mi selecci·n', skip: 'Empezar sin descargar', downloading: 'Instalando tu contenido·', days: 'sesiones por semana', equipment: 'Equipo disponible', retailer: 'Base de alimentos por pa·s', coreFoods: '142 alimentos esenciales ya est·n disponibles sin conexi·n.', recommended: 'Programa recomendado · GitHub', catalog: 'Cat·logo completo', extraExercises: '851 ejercicios adicionales' },
  de: { welcome: 'Dein pers·nlicher Start', intro: 'Mit wenigen Antworten passen wir Programme, ·bungen und Lebensmittel an.', language: 'Deine Sprache', goal: 'Was ist dein Hauptziel?', level: 'Wie ist dein aktuelles Niveau?', rhythm: 'Wie wirst du trainieren?', nutrition: 'Auch Ern·hrung personalisieren', result: 'Dein Bereich ist bereit', resultHelp: 'Das sind deine empfohlenen Downloads. Jetzt oder sp·ter installieren.', next: 'Weiter', back: 'Zur·ck', finish: 'Auswahl installieren', skip: 'Ohne Download starten', downloading: 'Inhalte werden installiert·', days: 'Einheiten pro Woche', equipment: 'Verfügbare Geräte', retailer: 'Lebensmitteldatenbank nach Land', coreFoods: '142 wichtige Lebensmittel sind bereits offline verf·gbar.', recommended: 'Empfohlenes Programm · GitHub', catalog: 'Vollst·ndiger Katalog', extraExercises: '851 zus·tzliche ·bungen' },
};

const retailerCopy: Record<LanguageId, Record<string, string>> = {
  fr: { placeholder: 'Choisir un pays', search: 'Rechercher un pays ou une enseigne', none: 'Aucune / plus tard', github: 'GitHub', close: 'Fermer', empty: 'Aucun pays trouv·' },
  en: { placeholder: 'Choose a country', search: 'Search a country or supermarket', none: 'None / later', github: 'GitHub', close: 'Close', empty: 'No country found' },
  es: { placeholder: 'Elegir un pa·s', search: 'Buscar pa·s o supermercado', none: 'Ninguno / m·s tarde', github: 'GitHub', close: 'Cerrar', empty: 'No se encontr· ning·n pa·s' },
  de: { placeholder: 'Land ausw·hlen', search: 'Land oder Supermarkt suchen', none: 'Keine / später', github: 'GitHub', close: 'Schlie·en', empty: 'Kein Land gefunden' },
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
    goals: { muscle: ['barbell-outline', 'Ganar m·sculo'], strength: ['trending-up-outline', 'Fuerza'], weight_loss: ['flame-outline', 'Perder peso'], fitness: ['heart-outline', 'Forma y salud'] },
    levels: { beginner: ['sparkles-outline', 'Estoy empezando'], intermediate: ['fitness-outline', 'Intermedio'], advanced: ['trophy-outline', 'Avanzado'] },
    equipmentProfiles: {
      bodyweight: ['body-outline', 'Casa, sin material'],
      'home-basic': ['home-outline', 'Casa, equipo básico'],
      dumbbells: ['barbell-outline', 'Solo mancuernas'],
      machines: ['settings-outline', 'Solo máquinas'],
      barbell: ['fitness-outline', 'Barra y mancuernas'],
      'full-gym': ['business-outline', 'Gimnasio completo'],
    },
    retailers: { auchan: ['basket-outline', 'Auchan Francia'], carrefour: ['cart-outline', 'Carrefour Francia'], none: ['remove-circle-outline', 'Ninguno / m·s tarde'] },
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
  const { language, setLanguage } = useTranslation();
  const text = copy[language];
  const options = translatedLabels[language];
  const profile = useOnboardingStore((state) => state.profile);
  const updateProfile = useOnboardingStore((state) => state.updateProfile);
  const complete = useOnboardingStore((state) => state.complete);
  const fetchManifest = useCommunityStore((state) => state.fetchManifest);
  const downloadProgram = useCommunityStore((state) => state.downloadProgram);
  const downloadFoodDatabase = useCommunityStore((state) => state.downloadFoodDatabase);
  const downloadExercisePack = useCommunityStore((state) => state.downloadExercisePack);
  const communityData = useCommunityStore((state) => state.data);
  const communityLoading = useCommunityStore((state) => state.loading);
  const [step, setStep] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [withExercises, setWithExercises] = useState(profile.level !== 'beginner');
  const totalSteps = 6;
  const retailerText = retailerCopy[language];
  const selectedFoodDatabaseId = profile.retailer === 'auchan'
    ? 'foods-auchan-fr-starter'
    : profile.retailer === 'carrefour'
      ? 'foods-carrefour-fr-starter'
      : profile.retailer === 'none' ? null : profile.retailer;
  const selectedFoodDatabase = communityData?.foodDatabases.find(
    (entry) => entry.id === selectedFoodDatabaseId
  );

  useEffect(() => {
    if (step >= 4 && !communityData && !communityLoading) {
      void fetchManifest();
    }
  }, [communityData, communityLoading, fetchManifest, step]);

  const programId = profile.level === 'beginner' || profile.goal === 'weight_loss'
    ? 'full-body-3'
    : profile.daysPerWeek >= 4 ? 'upper-lower-4' : 'ppl-3';
  const programName = programId === 'full-body-3' ? 'Full Body Débutant' : programId === 'upper-lower-4' ? 'Upper / Lower' : 'Push Pull Legs';

  const finish = async (download: boolean) => {
    setInstalling(true);
    try {
      if (download) {
        const manifest = await fetchManifest();
        if (!manifest) throw new Error('offline');
        const program = manifest.programs.find((item) => item.id === programId);
        if (program) await downloadProgram(program);
        if (withExercises && manifest.exercisePacks?.[0]) await downloadExercisePack(manifest.exercisePacks[0]);
        const foodId = selectedFoodDatabaseId;
        const foodPack = manifest.foodDatabases.find((item) => item.id === foodId);
        if (foodPack) await downloadFoodDatabase(foodPack);
      }
    } catch {
      appAlert('Téléchargement reporté', 'Tu peux retrouver tous ces contenus dans la rubrique Communauté. Les contenus essentiels restent disponibles hors ligne.');
    } finally {
      complete();
      setInstalling(false);
      router.replace('/(tabs)' as never);
    }
  };

  const title = [text.welcome, text.goal, text.level, text.rhythm, text.nutrition, text.result][step];
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.top}><View style={styles.progressTrack}><View style={[styles.progress, { width: `${((step + 1) / totalSteps) * 100}%` }]} /></View><Text style={styles.step}>{step + 1}/{totalSteps}</Text></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {step === 0 ? <View style={styles.heroIcon}><Ionicons name="pulse" size={40} color={c.primaryText} /></View> : null}
      <Text style={styles.eyebrow}>LIFE SPORT TRACKER</Text>
      <Text style={styles.title}>{title}</Text>
      {step === 0 ? <><Text style={styles.subtitle}>{text.intro}</Text><Text style={styles.sectionLabel}>{text.language}</Text><View style={styles.languageRow}>{LANGUAGE_OPTIONS.map((option) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: language === option.id }} key={option.id} style={[styles.language, language === option.id && styles.languageSelected]} onPress={() => setLanguage(option.id)}><Text style={[styles.languageText, language === option.id && styles.languageTextSelected]}>{option.id.toUpperCase()}</Text></TouchableOpacity>)}</View></> : null}
      {step === 1 ? <ChoiceGrid items={options.goals} value={profile.goal} onChange={(goal) => updateProfile({ goal: goal as OnboardingGoal })} /> : null}
      {step === 2 ? <ChoiceGrid items={options.levels} value={profile.level} onChange={(level) => { updateProfile({ level: level as OnboardingLevel }); setWithExercises(level !== 'beginner'); }} /> : null}
      {step === 3 ? <><Text style={styles.sectionLabel}>{text.days}</Text><View style={styles.daysRow}>{[2,3,4,5,6].map((days) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: profile.daysPerWeek === days }} key={days} style={[styles.day, profile.daysPerWeek === days && styles.daySelected]} onPress={() => updateProfile({ daysPerWeek: days })}><Text style={[styles.dayText, profile.daysPerWeek === days && styles.dayTextSelected]}>{days}</Text></TouchableOpacity>)}</View><Text style={styles.sectionLabel}>{text.equipment}</Text><ChoiceGrid items={options.equipmentProfiles} value={profile.equipmentProfileId} onChange={(equipmentProfileId) => updateProfile({ equipmentProfileId: equipmentProfileId as OnboardingEquipmentProfileId })} /></> : null}
      {step === 4 ? <><Text style={styles.subtitle}>{text.coreFoods}</Text><RetailerPicker entries={communityData?.foodDatabases ?? []} value={selectedFoodDatabaseId} loading={communityLoading} label={text.retailer} placeholder={retailerText.placeholder} searchPlaceholder={retailerText.search} noneLabel={retailerText.none} githubLabel={retailerText.github} closeLabel={retailerText.close} emptyLabel={retailerText.empty} onChange={(id) => updateProfile({ retailer: id ?? 'none' })} onRefresh={() => void fetchManifest()} /></> : null}
      {step === 5 ? <><Text style={styles.subtitle}>{text.resultHelp}</Text><View style={styles.recommendation}><View style={styles.recIcon}><Ionicons name="barbell-outline" size={22} color={c.primary} /></View><View style={styles.recCopy}><Text style={styles.recTitle}>{programName}</Text><Text style={styles.recMeta}>{text.recommended}</Text></View><Ionicons name="checkmark-circle" size={22} color={c.success} /></View><TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: withExercises }} style={[styles.recommendation, withExercises && styles.recommendationActive]} onPress={() => setWithExercises(!withExercises)}><View style={styles.recIcon}><Ionicons name="cloud-download-outline" size={22} color={c.primary} /></View><View style={styles.recCopy}><Text style={styles.recTitle}>{text.catalog}</Text><Text style={styles.recMeta}>{text.extraExercises}</Text></View><Ionicons name={withExercises ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={withExercises ? c.success : c.textMuted} /></TouchableOpacity>{selectedFoodDatabase ? <View style={styles.recommendation}><View style={styles.recIcon}><Ionicons name="basket-outline" size={22} color={c.primary} /></View><View style={styles.recCopy}><Text style={styles.recTitle}>{selectedFoodDatabase.country ?? selectedFoodDatabase.retailer ?? selectedFoodDatabase.name}</Text><Text style={styles.recMeta}>{selectedFoodDatabase.retailers?.join(', ') ?? selectedFoodDatabase.retailer ?? selectedFoodDatabase.name} · {selectedFoodDatabase.foodsCount} aliments · {selectedFoodDatabase.license ?? 'GitHub'}</Text></View><Ionicons name="checkmark-circle" size={22} color={c.success} /></View> : null}</> : null}
      {installing ? <View style={styles.installing}><ActivityIndicator color={c.primary} /><Text style={styles.installingText}>{text.downloading}</Text></View> : null}
    </ScrollView>
    {step < totalSteps - 1 ? <View style={styles.footer}>{step > 0 && !installing ? <TouchableOpacity accessibilityRole="button" style={styles.backButton} onPress={() => setStep(step - 1)}><Ionicons name="arrow-back" size={20} color={c.textPrimary} /><Text style={styles.backText}>{text.back}</Text></TouchableOpacity> : <View />}<Button title={text.next} onPress={() => setStep(step + 1)} style={styles.nextButton} /></View> : <View style={styles.finalFooter}><Button title={text.finish} loading={installing} onPress={() => void finish(true)} style={styles.installButton} /><View style={styles.finalSecondary}><TouchableOpacity accessibilityRole="button" disabled={installing} style={styles.backButton} onPress={() => setStep(step - 1)}><Ionicons name="arrow-back" size={18} color={c.textPrimary} /><Text style={styles.backText}>{text.back}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={installing} onPress={() => void finish(false)}><Text style={styles.skipText}>{text.skip}</Text></TouchableOpacity></View></View>}
  </SafeAreaView>;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg }, top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8 }, progressTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: c.surfaceAlt }, progress: { height: '100%', borderRadius: 3, backgroundColor: c.primary }, step: { fontFamily: fonts.sansBold, color: c.textMuted, fontSize: 12 }, content: { padding: 24, paddingTop: 30, paddingBottom: 20 }, heroIcon: { width: 72, height: 72, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary, marginBottom: 26 }, eyebrow: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.8, color: c.primary, marginBottom: 10 }, title: { fontFamily: fonts.sansHeavy, fontSize: 32, lineHeight: 37, color: c.textPrimary, marginBottom: 12 }, subtitle: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: c.textSecondary, marginBottom: 28 }, sectionLabel: { fontFamily: fonts.sansBold, fontSize: 13, color: c.textPrimary, marginTop: 18, marginBottom: 11 }, languageRow: { flexDirection: 'row', gap: 9 }, language: { flex: 1, minHeight: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }, languageSelected: { backgroundColor: c.primary, borderColor: c.primary }, languageText: { fontFamily: fonts.sansBold, color: c.textPrimary }, languageTextSelected: { color: c.primaryText }, choiceGrid: { gap: 10, marginTop: 12 }, choice: { minHeight: 68, borderRadius: 17, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 12 }, choiceSelected: { borderColor: c.primary, backgroundColor: c.accentSoft }, choiceIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentSoft }, choiceIconSelected: { backgroundColor: c.primary }, choiceText: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 16, color: c.textPrimary }, choiceTextSelected: { fontFamily: fonts.sansBold }, daysRow: { flexDirection: 'row', gap: 9, marginBottom: 18 }, day: { flex: 1, aspectRatio: 1, maxHeight: 58, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }, daySelected: { backgroundColor: c.primary, borderColor: c.primary }, dayText: { fontFamily: fonts.sansBold, fontSize: 18, color: c.textPrimary }, dayTextSelected: { color: c.primaryText }, recommendation: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 17, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, marginBottom: 10 }, recommendationActive: { borderColor: c.primary }, recIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: c.accentSoft }, recCopy: { flex: 1 }, recTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: c.textPrimary }, recMeta: { fontFamily: fonts.sans, fontSize: 12, color: c.textSecondary, marginTop: 3 }, installing: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 18 }, installingText: { fontFamily: fonts.sansSemi, color: c.textSecondary }, footer: { minHeight: 80, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface }, finalFooter: { minHeight: 122, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 20, paddingVertical: 12, gap: 4, backgroundColor: c.surface }, installButton: { width: '100%' }, finalSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, backButton: { flexDirection: 'row', gap: 7, minHeight: 42, alignItems: 'center', paddingHorizontal: 8 }, backText: { fontFamily: fonts.sansSemi, color: c.textPrimary }, nextButton: { minWidth: 150 }, skipText: { maxWidth: 180, textAlign: 'right', fontFamily: fonts.sansSemi, fontSize: 12, color: c.textSecondary },
});
