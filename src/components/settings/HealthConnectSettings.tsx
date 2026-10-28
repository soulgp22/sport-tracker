import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../ui/Button';
import { useHealthConnectSettings } from '../../hooks/useHealthConnectSettings';
import { useTranslation } from '../../i18n/useTranslation';
import type { HealthConnectDiagnostics } from '../../lib/healthConnect';
import type { WidgetLastRefresh } from '../../lib/widgets/dailyGoalsWidget';
import { fonts } from '../../theme/fonts';
import type { ThemeColors } from '../../theme/palettes';
import { cardShadow, radius, spacing } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';

type StatusKey = 'loading' | 'connected' | 'disconnected' | 'notInstalled' | 'needsUpdate' | 'unavailable';

/** Libelle de statut affiche, deduit des diagnostics (pur). */
export function healthStatusKey(d: HealthConnectDiagnostics | null): StatusKey {
  if (!d) return 'loading';
  if (d.status === 'not-installed') return 'notInstalled';
  if (d.status === 'needs-update') return 'needsUpdate';
  if (d.status !== 'available') return 'unavailable';
  return d.connected ? 'connected' : 'disconnected';
}

function formatWhen(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Section « Health Connect » de Parametres : statut, autorisation par donnee,
 * etat du rafraichissement du widget, et les actions connecter / autoriser
 * l'arriere-plan / gerer / reinitialiser. Toute la logique vit dans
 * `useHealthConnectSettings` ; ce composant ne fait que presenter.
 */
export function HealthConnectSettings() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { t, locale } = useTranslation();
  const { diagnostics, lastRefresh, busy, connect, allowBackground, reset, manage, install } =
    useHealthConnectSettings();

  const status = healthStatusKey(diagnostics);
  const available = diagnostics?.status === 'available';
  const connected = status === 'connected';
  // Permission d'arriere-plan absente de ce build : ni sa ligne, ni son bouton,
  // ni l'etat du widget (qui ne se rafraichit alors qu'a l'ouverture de l'app).
  const backgroundSupported = diagnostics?.backgroundSupported === true;

  const permissionRows: { key: string; label: string; granted: boolean }[] = diagnostics
    ? [
        { key: 'steps', label: t('settings.health.perm.steps'), granted: diagnostics.steps },
        { key: 'active', label: t('settings.health.perm.activeCalories'), granted: diagnostics.activeCalories },
        { key: 'total', label: t('settings.health.perm.totalCalories'), granted: diagnostics.totalCalories },
        ...(backgroundSupported
          ? [{ key: 'background', label: t('settings.health.perm.background'), granted: diagnostics.background }]
          : []),
      ]
    : [];

  return (
    <View style={styles.section} testID="settings-health">
      <Text style={styles.sectionTitle}>{t('settings.health.title')}</Text>
      <Text style={styles.helpText}>{t('settings.health.help')}</Text>

      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Ionicons
            name={connected ? 'checkmark-circle' : 'alert-circle-outline'}
            size={20}
            color={connected ? c.success : c.textMuted}
          />
          <Text style={[styles.statusText, connected ? { color: c.success } : null]} testID="settings-health-status">
            {t(`settings.health.status.${status}`)}
          </Text>
        </View>

        {available
          ? permissionRows.map((row) => (
              <View key={row.key} style={styles.permRow} testID={`settings-health-perm-${row.key}`}>
                <Text style={styles.permLabel}>{row.label}</Text>
                <Text style={[styles.permValue, row.granted ? { color: c.success } : null]}>
                  {t(row.granted ? 'settings.health.granted' : 'settings.health.denied')}
                </Text>
              </View>
            ))
          : null}

        {available && backgroundSupported ? <WidgetRefreshLine lastRefresh={lastRefresh} locale={locale} styles={styles} /> : null}
      </View>

      {status === 'notInstalled' || status === 'needsUpdate' ? (
        <Button
          title={t('nutrition.healthConnect.openPlayStore')}
          onPress={() => void install()}
          style={styles.actionBtn}
        />
      ) : null}

      {status === 'disconnected' ? (
        <Button
          title={t('nutrition.balance.connect')}
          onPress={() => void connect()}
          loading={busy}
          style={styles.actionBtn}
        />
      ) : null}

      {connected && backgroundSupported && diagnostics && !diagnostics.background ? (
        <Button
          title={t('settings.health.allowBackground')}
          variant="secondary"
          onPress={() => void allowBackground()}
          loading={busy}
          style={styles.actionBtn}
        />
      ) : null}

      {available ? (
        <Button
          title={t('settings.health.manage')}
          variant="secondary"
          onPress={() => void manage()}
          style={styles.actionBtn}
        />
      ) : null}

      {available ? (
        <Button
          title={t('settings.health.reset')}
          variant="ghost"
          onPress={reset}
          disabled={busy}
          style={styles.actionBtn}
        />
      ) : null}
    </View>
  );
}

function WidgetRefreshLine({
  lastRefresh,
  locale,
  styles,
}: {
  lastRefresh: WidgetLastRefresh | null;
  locale: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  const { t } = useTranslation();
  const text = !lastRefresh
    ? t('settings.health.lastRefresh.never')
    : lastRefresh.ok
      ? t('settings.health.lastRefresh.ok', {
          date: formatWhen(lastRefresh.at, locale),
          steps: Math.round(lastRefresh.steps ?? 0).toLocaleString(locale),
        })
      : t('settings.health.lastRefresh.failed', { date: formatWhen(lastRefresh.at, locale) });
  return (
    <Text style={styles.refreshText} testID="settings-health-last-refresh">
      {text}
    </Text>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: { gap: 12 },
    sectionTitle: {
      fontSize: 13,
      fontFamily: fonts.sansBold,
      color: c.textPrimary,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingBottom: spacing.xs,
    },
    helpText: { fontSize: 13, fontFamily: fonts.sans, color: c.textSecondary, lineHeight: 18 },
    actionBtn: { marginTop: 4 },
    card: {
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      ...cardShadow(c),
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
    statusText: { fontSize: 15, fontFamily: fonts.sansBold, color: c.textPrimary },
    permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    permLabel: { flex: 1, fontSize: 13, fontFamily: fonts.sans, color: c.textSecondary },
    permValue: { fontSize: 13, fontFamily: fonts.sansSemi, color: c.textMuted },
    refreshText: { fontSize: 11, lineHeight: 15, fontFamily: fonts.sans, color: c.textMuted, marginTop: 4 },
  });
