/**
 * Fichiers de police chargés au démarrage (`useFonts` dans app/_layout.tsx).
 * Clé = nom de famille employé par les jetons de FONT_THEMES. Tout est chargé
 * d'emblée : ~20 fichiers locaux, et changer de police dans Réglages ne doit
 * pas attendre un chargement ni afficher la police système entre-temps.
 */
import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible';
import {
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import {
  Barlow_400Regular,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
} from '@expo-google-fonts/fraunces';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import { Oswald_500Medium, Oswald_600SemiBold, Oswald_700Bold } from '@expo-google-fonts/oswald';

export const FONT_FILES = {
  Oswald_500Medium,
  Oswald_600SemiBold,
  Oswald_700Bold,
  Archivo_400Regular,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  'OstrichSans-Medium': require('../../assets/fonts/OstrichSans-Medium.otf'),
  'OstrichSans-Heavy': require('../../assets/fonts/OstrichSans-Heavy.otf'),
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
  Barlow_400Regular,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
} as const;
