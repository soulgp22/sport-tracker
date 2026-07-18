import { useMemo, useSyncExternalStore } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  const styles = useMemo(() => makeStyles(c), [c]);
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
          <View style={styles.card} accessibilityRole="alert">
            <View style={[styles.icon, isDestructive ? styles.iconDanger : null]}>
              <Ionicons
                name={isDestructive ? 'alert-outline' : 'checkmark-circle-outline'}
                size={25}
                color={isDestructive ? c.danger : c.primary}
              />
            </View>

            <Text style={styles.title}>{tr(dialog?.title ?? '')}</Text>

            {dialog?.message ? (
              <ScrollView
                style={styles.messageScroll}
                contentContainerStyle={styles.messageContent}
                showsVerticalScrollIndicator={false}
                bounces={false}>
                <Text style={styles.message}>{tr(dialog.message)}</Text>
              </ScrollView>
            ) : null}

            <View style={[styles.actions, dialog && dialog.buttons.length > 2 ? styles.actionsStack : null]}>
              {dialog?.buttons.map((button, index) => {
                const destructive = button.style === 'destructive';
                const cancel = button.style === 'cancel';
                return (
                  <TouchableOpacity
                    key={`${dialog.id}-${button.text ?? index}`}
                    style={[
                      styles.action,
                      dialog.buttons.length > 2 ? styles.actionStacked : null,
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: c.overlay,
  },
  safe: { width: '100%', maxWidth: 440, alignItems: 'stretch' },
  card: {
    maxHeight: '82%',
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
  },
  icon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: c.accentSoft,
    marginBottom: 15,
  },
  iconDanger: { backgroundColor: `${c.danger}18` },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    lineHeight: 25,
    color: c.textPrimary,
  },
  messageScroll: { maxHeight: 320, marginTop: 9 },
  messageContent: { paddingBottom: 2 },
  message: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: c.textSecondary,
  },
  actions: { flexDirection: 'row', gap: 9, marginTop: 20 },
  actionsStack: { flexDirection: 'column-reverse' },
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
