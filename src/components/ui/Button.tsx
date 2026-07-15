import { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export function Button({ title, variant = 'primary', loading, style, disabled, ...rest }: ButtonProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled || loading ? styles.disabled : null, style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? c.primary : c.primaryText} size="small" />
      ) : (
        <Text style={[styles.label, variant === 'secondary' ? styles.labelSecondary : null]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: { backgroundColor: c.primary },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.primary },
  danger: { backgroundColor: c.danger },
  disabled: { opacity: 0.5 },
  label: { color: c.primaryText, fontFamily: fonts.sansSemi, fontSize: 16 },
  labelSecondary: { color: c.primary },
});
