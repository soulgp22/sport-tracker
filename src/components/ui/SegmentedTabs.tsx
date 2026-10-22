import { useEffect, useMemo, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from 'react-native';

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
  /**
   * Variante defilante : quand `true`, la rangee (fond, rayon, marges, padding
   * identiques) contient un `ScrollView` horizontal et les onglets renoncent a
   * `flex: 1` au profit d'une largeur naturelle (`paddingHorizontal:
   * spacing.md`, `minWidth` 70, `minHeight` 42). L'onglet actif est
   * automatiquement centre dans la zone visible grace a `scrollTo` (borne au
   * defilement possible), memorisant la position et la largeur de chaque onglet
   * via `onLayout`. Quand `false` (défaut), le rendu est strictement identique
   * a la version historique.
   */
  scrollable?: boolean;
}

/**
 * Onglets segmentes : pastilles arrondies sur un fond `surfaceAlt`, la
 * pastille active en `primary`.
 *
 * Extrait a l'identique du motif de Progression et de Communaute (memes
 * rayons, memes espacements, meme police), qui le dupliquaient chacun. Ces deux
 * ecrans n'ont pas ete migres ici pour ne pas elargir la portee ; ils peuvent
 * l'adopter sans changement visuel.
 *
 * Variante `scrollable` : pour un grand nombre d'onglets qui ne tiennent pas
 * sur une rangée a flex égal, le conteneur enveloppe un `ScrollView`
 * horizontal au meme habillage (font `sansBold` 12, pastille `primary`,
 * `minHeight` 42, `radius.sm`). L'onglet actif est centré dans la zone par un
 * `scrollTo` animé (animé sauf au premier affichage).
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  testID,
  scrollable = false,
}: SegmentedTabsProps<T>) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const scrollRef = useRef<ScrollView | null>(null);
  const tabPositions = useRef<Record<string, { x: number; width: number }>>({});
  const viewportWidth = useRef<number | undefined>(undefined);
  const contentWidth = useRef<number | undefined>(undefined);
  const didInitialScroll = useRef(false);

  const scrollToValue = (target: T, animated: boolean) => {
    const tab = tabPositions.current[target];
    const viewport = viewportWidth.current;
    if (tab === undefined || viewport === undefined) {
      return;
    }
    const desired = tab.x + tab.width / 2 - viewport / 2;
    const maxScroll = contentWidth.current === undefined
      ? undefined
      : Math.max(0, contentWidth.current - viewport);
    const clamped = maxScroll === undefined
      ? Math.max(0, desired)
      : Math.max(0, Math.min(desired, maxScroll));
    scrollRef.current?.scrollTo({ x: clamped, animated });
  };

  // À chaque changement de valeur, ramène l'onglet actif dans la vue en le
  // centrant. L'onglet actif doit être posé et le viewport mesuré pour défiler.
  useEffect(() => {
    if (scrollable) {
      scrollToValue(value, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollable, value]);

  const captureLayout = (optionValue: T) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    tabPositions.current[optionValue] = { x, width };
    // Premier affichage (lien profond vers le dernier onglet) : dès que les
    // mesures de l'onglet actif et du viewport sont connues pour la première
    // fois, on défile sans animation.
    if (
      optionValue === value &&
      viewportWidth.current !== undefined &&
      !didInitialScroll.current
    ) {
      scrollToValue(optionValue, false);
      didInitialScroll.current = true;
    }
  };

  const captureViewport = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    viewportWidth.current = width;
    const tab = tabPositions.current[value];
    if (tab !== undefined && !didInitialScroll.current) {
      scrollToValue(value, false);
      didInitialScroll.current = true;
    }
  };

  const captureContentSize = (width: number) => {
    contentWidth.current = width;
  };

  if (scrollable) {
    return (
      <View style={styles.row} testID={testID} accessibilityRole="tablist">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          onLayout={captureViewport}
          onContentSizeChange={captureContentSize}
          testID={testID ? `${testID}-scroll` : undefined}>
          {options.map((option) => (
            <View
              key={option.value}
              onLayout={captureLayout(option.value)}
              collapsable={false}
              style={styles.tabScrollWrap}>
              <TouchableOpacity
                style={[styles.tabScroll, selected(option, value) && styles.tabSelected]}
                onPress={() => onChange(option.value)}
                activeOpacity={0.75}
                accessibilityRole="tab"
                accessibilityState={{ selected: selected(option, value) }}
                testID={testID ? `${testID}-${option.value}` : undefined}>
                <Text
                  numberOfLines={1}
                  style={[styles.tabText, selected(option, value) && styles.tabTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.row} testID={testID} accessibilityRole="tablist">
      {options.map((option) => {
        const isSelected = selected(option, value);
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.tab, isSelected && styles.tabSelected]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            testID={testID ? `${testID}-${option.value}` : undefined}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
              style={[styles.tabText, isSelected && styles.tabTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function selected<T extends string>(option: SegmentedTabOption<T>, value: T): boolean {
  return option.value === value;
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
    scrollContent: { gap: spacing.xxs },
    tabScrollWrap: { flexDirection: 'row', alignItems: 'center' },
    tabScroll: {
      minWidth: 70,
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
    },
  });
