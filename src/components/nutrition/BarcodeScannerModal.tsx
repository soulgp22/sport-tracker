import { useEffect, useMemo, useRef } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../ui/Button';
import { useTranslation } from '../../i18n/useTranslation';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';


const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

interface BarcodeScannerModalProps {
  onClose: () => void;
  onScanned: (barcode: string) => void;
}

/**
 * Modale plein écran de scan de code-barres (montée/démontée par le parent).
 * `onScanned` n'est appelé qu'une fois par ouverture (garde anti-doublon) :
 * le parent démonte la modale au premier scan.
 */
export function BarcodeScannerModal({ onClose, onScanned }: BarcodeScannerModalProps) {
  const c = useColors();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [permission, requestPermission] = useCameraPermissions();
  const lockedRef = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    const data = result.data?.trim();
    if (lockedRef.current || !data) return;
    lockedRef.current = true;
    onScanned(data);
  };

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View style={styles.permissionBlock}>
            <Ionicons name="barcode-outline" size={42} color={c.textSecondary} />
            <Text style={styles.permissionText}>{t('nutrition.scan.permission')}</Text>
            <Button
              title={t('nutrition.scan.permissionCta')}
              onPress={() => void requestPermission()}
            />
          </View>
        )}

        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
          <View style={styles.topBar} pointerEvents="box-none">
            <Text style={styles.topTitle} numberOfLines={1}>
              {t('nutrition.scan.title')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={8}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}>
              <Ionicons name="close" size={20} color={c.primaryText} />
            </TouchableOpacity>
          </View>

          <View style={styles.aimZone} pointerEvents="none">
            <View style={styles.aimFrame} />
          </View>

          <View style={styles.bottomBlock} pointerEvents="none">
            <Text style={styles.hint}>{t('nutrition.scan.hint')}</Text>
            <Text style={styles.source}>{t('nutrition.scan.source')}</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: c.primaryText,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.overlay,
  },
  aimZone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  aimFrame: {
    width: 240,
    height: 150,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: c.primary,
    backgroundColor: 'transparent',
  },
  bottomBlock: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: 24 },
  hint: {
    fontSize: 14,
    fontFamily: fonts.sansBold,
    color: c.primaryText,
    textAlign: 'center',
  },
  source: {
    fontSize: 12,
    fontFamily: fonts.sans,
    color: c.primaryText,
    textAlign: 'center',
    opacity: 0.8,
  },
  permissionBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  permissionText: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
