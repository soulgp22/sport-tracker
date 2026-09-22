import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '../../theme/useColors';
import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';

interface ScreenHeaderProps {
  /** Petit libellé de section, au-dessus du titre (« SÉANCE », « NUTRITION »). */
  kicker: string;
  title: string;
  /** Actions alignées sur le kicker, à droite (icônes, lien). */
  right?: ReactNode;
  testID?: string;
}

/**
 * En-tête éditorial des écrans principaux : kicker bleu en capitales, grand
 * titre en Oswald, filet de 2 px dessous.
 *
 * Extrait À L'IDENTIQUE des en-têtes de Nutrition, Progression et Historique,
 * qui le recopient chacun dans leurs styles. Ces écrans ne sont pas migrés
 * (hors portée) : ils peuvent l'adopter sans changement visuel.
 *
 * L'écran qui l'emploie masque l'en-tête natif de sa pile (`headerShown:
 * false`) : sinon deux titres, dont un en Archivo — le défaut que Séance et
 * Programmes présentaient.
 */
export function ScreenHeader({ kicker, title, right, testID = 'screen-header' }: ScreenHeaderProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.header} testID={testID}>
      <View style={styles.headerRow}>
        <Text style={styles.headerKicker}>{kicker}</Text>
        {right}
      </View>
      <Text style={styles.headerTitle} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 14,
      borderBottomWidth: 2,
      borderBottomColor: c.border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
      fontSize: 34,
      lineHeight: 40,
      marginTop: 6,
      color: c.textPrimary,
    },
  });
