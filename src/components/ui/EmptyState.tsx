import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';
import { useTranslation } from '../../i18n/useTranslation';

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'archive-outline', title, subtitle }: EmptyStateProps) {
  const c = useColors();
  const { tr } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={c.textMuted} />
      <Text style={styles.title}>{tr(title)}</Text>
      {subtitle ? <Text style={styles.subtitle}>{tr(subtitle)}</Text> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  title: { fontSize: 18, fontFamily: fonts.sansSemi, color: c.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: fonts.sans, color: c.textSecondary, textAlign: 'center' },
});
