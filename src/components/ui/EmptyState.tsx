import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';
import { useTranslation } from '../../i18n/useTranslation';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  /** CTA optionnel : transforme l'état vide en point de départ guidé. */
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'archive-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const c = useColors();
  const { tr } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <Ionicons name={icon} size={30} color={c.primary} />
      </View>
      <Text style={styles.title}>{tr(title)}</Text>
      {subtitle ? <Text style={styles.subtitle}>{tr(subtitle)}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="soft" compact onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
    },
    iconBadge: {
      width: 64,
      height: 64,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
      marginBottom: spacing.xxs,
    },
    title: {
      fontSize: 18,
      fontFamily: fonts.sansSemi,
      color: c.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      fontFamily: fonts.sans,
      color: c.textSecondary,
      textAlign: 'center',
    },
    action: { marginTop: spacing.xs },
  });
