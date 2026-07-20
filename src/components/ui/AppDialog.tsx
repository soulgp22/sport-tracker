import { useMemo, useSyncExternalStore } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type AlertButton,
  type AlertOptions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import { useColors } from '../../theme/useColors';
import { useTranslation } from '../../i18n/useTranslation';

interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
}

let currentDialog: DialogRequest | null = null;
let nextDialogId = 1;
const dialogQueue: DialogRequest[] = [];
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentDialog;
}

function showNextDialog() {
  currentDialog = dialogQueue.shift() ?? null;
  emitChange();
}

export function appAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions
) {
  const request: DialogRequest = {
    id: nextDialogId++,
    title,
    message,
    buttons: buttons?.length ? buttons : [{ text: 'OK', style: 'default' }],
    options,
  };

  if (currentDialog) {
    dialogQueue.push(request);
    return;
  }

  currentDialog = request;
  emitChange();
}

export function AppDialog() {
  const c = useColors();
  const { tr } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const cardMaxHeight = windowHeight * 0.82;
  const styles = useMemo(() => makeStyles(c, cardMaxHeight), [c, cardMaxHeight]);
  const dialog = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const isDestructive = dialog?.buttons.some((button) => button.style === 'destructive') ?? false;

  const dismiss = (button?: AlertButton) => {
    const dismissedDialog = currentDialog;
    currentDialog = null;
    emitChange();

    setTimeout(() => {
      button?.onPress?.();
      if (!button) dismissedDialog?.options?.onDismiss?.();
      // A callback may synchronously open another dialog. Keep it visible and
      // only advance the queue when no replacement was created.
      if (!currentDialog) showNextDialog();
    }, 0);
  };

  const requestClose = () => {
    if (dialog?.options?.cancelable === false) return;
    dismiss();
  };

  return (
    <Modal
      visible={Boolean(dialog)}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        <SafeAreaView style={styles.safe} pointerEvents="box-none">
          <View style={styles.card} accessibilityRole="alert" testID="app-dialog-card">
            <View style={styles.grabber} />
            <View style={styles.headerRow}>
              <View style={[styles.icon, isDestructive ? styles.iconDanger : null]}>
                <Ionicons
                  name={isDestructive ? 'alert-outline' : 'sparkles-outline'}
                  size={23}
                  color={isDestructive ? c.danger : c.primary}
                />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>{isDestructive ? 'CONFIRMATION' : 'LIFE SPORT TRACKER'}</Text>
                <Text style={styles.title}>{tr(dialog?.title ?? '')}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={requestClose} accessibilityRole="button">
                <Ionicons name="close" size={20} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.bodyArea}>
              {dialog?.message ? (
              <ScrollView
                style={styles.messageScroll}
                contentContainerStyle={styles.messageContent}
                showsVerticalScrollIndicator={false}
                bounces={false}>
                <Text style={styles.message}>{tr(dialog.message)}</Text>
              </ScrollView>
            ) : null}
            </View>

            <View style={styles.actions}>
              {dialog?.buttons.map((button, index) => {
                const destructive = button.style === 'destructive';
                const cancel = button.style === 'cancel';
                return (
                  <TouchableOpacity
                    key={`${dialog.id}-${button.text ?? index}`}
                    style={[
                      styles.action,
                      cancel ? styles.actionCancel : null,
                      destructive ? styles.actionDanger : null,
                    ]}
                    onPress={() => dismiss(button)}
                    activeOpacity={0.75}
                    accessibilityRole="button">
                    <Text
                      style={[
                        styles.actionText,
                        cancel ? styles.actionTextCancel : null,
                        destructive ? styles.actionTextDanger : null,
                      ]}>
                      {tr(button.text ?? 'OK')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors, cardMaxHeight: number) => StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: c.overlay,
  },
  safe: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  card: {
    maxHeight: cardMaxHeight,
    width: '100%',
    maxWidth: 560,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  grabber: { width: 42, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 1.4, color: c.primary, marginBottom: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: c.accentSoft,
  },
  iconDanger: { backgroundColor: `${c.danger}18` },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 19,
    lineHeight: 23,
    color: c.textPrimary,
  },
  /** Wraps the message ScrollView so it flex-shrinks when the card content
   *  overflows, keeping header and actions fully visible without overlap. */
  bodyArea: { flexShrink: 1 },
  messageScroll: { marginTop: 16 },
  messageContent: { padding: 14, borderRadius: 14, backgroundColor: c.surfaceAlt },
  message: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
  },
  actions: { flexDirection: 'column-reverse', gap: 9, marginTop: 16 },
  action: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: c.primary,
  },
  actionStacked: { flex: 0 },
  actionCancel: { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border },
  actionDanger: { backgroundColor: c.danger },
  actionText: { fontFamily: fonts.sansBold, fontSize: 14, color: c.primaryText },
  actionTextCancel: { color: c.textPrimary },
  actionTextDanger: { color: '#FFFFFF' },
});
