import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { makeTypeScale, spacing } from '../../theme/tokens';
import { useTranslation } from '../../i18n/useTranslation';

interface SectionHeaderProps {
  /** Petit libellé en capitales au-dessus du titre (optionnel). */
  eyebrow?: string;
  title: string;
  /** Contenu à droite (badge, bouton discret, etc.). */
  right?: ReactNode;
}

/**
 * En-tête de section homogène : eyebrow tiny + titre, avec slot à droite.
 * Remplace les duplications « sectionEyebrow/sectionTitle » des écrans.
 */
export function SectionHeader({ eyebrow, title, right }: SectionHeaderProps) {
  const c = useColors();
  const { tr } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{tr(eyebrow)}</Text> : null}
        <Text style={styles.title}>{tr(title)}</Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => {
  const type = makeTypeScale();
  return StyleSheet.create({
    row: {
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    copy: { flexShrink: 1, gap: 2 },
    eyebrow: { ...type.tiny, color: c.primary },
    title: { ...type.title, color: c.textPrimary },
    right: { flexShrink: 0 },
  });
};
