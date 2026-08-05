import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';
import { radius, spacing, TOUCH_TARGET } from '../../theme/tokens';
import { useTranslation } from '../../i18n/useTranslation';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ListRowProps {
  icon?: IoniconsName;
  /** Couleur d'accent de l'icône (défaut : primary). */
  accent?: 'primary' | 'secondary' | 'success' | 'danger';
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Affiche le chevron de navigation (défaut : true si onPress). */
  showChevron?: boolean;
  /** Contenu à droite à la place du chevron (switch, badge...). */
  right?: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * Ligne de liste standard (icône dans badge arrondi + titre/sous-titre +
 * chevron) : pattern répété dans l'accueil, les réglages et les catalogues.
 */
export function ListRow({
  icon,
  accent = 'primary',
  title,
  subtitle,
  onPress,
  showChevron,
  right,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ListRowProps) {
  const c = useColors();
  const { tr } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const chevron = showChevron ?? Boolean(onPress);

  const content = (
    <>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: `${c[accent]}1A` }]}>
          <Ionicons name={icon} size={20} color={c[accent]} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {tr(title)}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {tr(subtitle)}
          </Text>
        ) : null}
      </View>
      {right ? (
        right
      ) : chevron ? (
        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? tr(title)}
        accessibilityHint={accessibilityHint}
        testID={testID}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.row} testID={testID}>
      {content}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      minHeight: TOUCH_TARGET + 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xxs,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    title: { fontSize: 15, fontFamily: fonts.sansSemi, color: c.textPrimary },
    subtitle: { fontSize: 12, lineHeight: 15, fontFamily: fonts.sans, color: c.textMuted },
  });
