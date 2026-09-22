import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';

export interface SegmentedTabOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  options: SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Identifiant de test du conteneur ; chaque onglet recoit `${testID}-${value}`. */
  testID?: string;
}

/**
 * Onglets segmentes : pastilles arrondies sur un fond `surfaceAlt`, la
 * pastille active en `primary`.
 *
 * Extrait a l'identique du motif de Progression et de Communaute (memes
 * rayons, memes espacements, meme police), qui le dupliquaient chacun. Ces deux
 * ecrans n'ont pas ete migres ici pour ne pas elargir la portee ; ils peuvent
 * l'adopter sans changement visuel.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SegmentedTabsProps<T>) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.row} testID={testID} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.tab, selected && styles.tabSelected]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${option.value}` : undefined}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
              style={[styles.tabText, selected && styles.tabTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.xxs,
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      padding: spacing.xxs,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
    },
    tab: {
      flex: 1,
      minWidth: 70,
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxs,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.sm,
    },
    tabSelected: { backgroundColor: c.primary },
    tabText: {
      flexShrink: 1,
      fontSize: 12,
      fontFamily: fonts.sansBold,
      textAlign: 'center',
      color: c.textSecondary,
    },
    tabTextSelected: { color: c.primaryText },
  });
