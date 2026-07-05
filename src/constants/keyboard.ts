import { Platform, type KeyboardAvoidingViewProps } from 'react-native';

export const keyboardAvoidingBehavior: KeyboardAvoidingViewProps['behavior'] =
  Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined;

export const keyboardVerticalOffset = 0;
