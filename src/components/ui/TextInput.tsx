import { useMemo } from 'react';
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

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
}

export function TextInput({ label, error, style, ...rest }: TextInputProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <RNTextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={c.textMuted}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontSize: 14, fontFamily: fonts.sansSemi, color: c.textPrimary },
  input: {
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: fonts.sans,
    color: c.textPrimary,
    backgroundColor: c.surfaceAlt,
    minHeight: 44,
  },
  inputError: { borderColor: c.danger },
  error: { fontSize: 12, fontFamily: fonts.sans, color: c.danger },
});
