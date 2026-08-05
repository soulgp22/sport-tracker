import { useMemo, useState } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  Text,
  View,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';
import { useTranslation } from '../../i18n/useTranslation';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
}

export function TextInput({ label, error, style, onFocus, onBlur, ...rest }: TextInputProps) {
  const c = useColors();
  const { tr } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [focused, setFocused] = useState(false);
  const translatedLabel = label ? tr(label) : undefined;
  const translatedError = error ? tr(error) : undefined;
  const translatedPlaceholder =
    typeof rest.placeholder === 'string' ? tr(rest.placeholder) : rest.placeholder;
  return (
    <View style={styles.wrapper}>
      {translatedLabel ? <Text style={styles.label}>{translatedLabel}</Text> : null}
      <RNTextInput
        style={[
          styles.input,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={c.textMuted}
        accessibilityLabel={rest.accessibilityLabel ?? translatedLabel}
        accessibilityState={{ disabled: rest.editable === false }}
        {...rest}
        placeholder={translatedPlaceholder}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
      {translatedError ? <Text style={styles.error}>{translatedError}</Text> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrapper: { gap: spacing.xxs },
    label: { fontSize: 14, fontFamily: fonts.sansSemi, color: c.textPrimary },
    input: {
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: fonts.sans,
      color: c.textPrimary,
      backgroundColor: c.surface,
      minHeight: 48,
    },
    inputFocused: { borderColor: c.primary },
    inputError: { borderColor: c.danger },
    error: { fontSize: 12, fontFamily: fonts.sans, color: c.danger },
  });
