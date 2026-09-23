/**
 * Ecran d'abonnement (F01-C) et ses choix de conversion (F01-D).
 *
 * Choix de conversion, tous verifiables et sans promesse inventee :
 * - le CONTEXTE d'abord : arrive par la limite, l'ecran dit pourquoi
 *   (« tes 2 analyses gratuites du jour sont utilisees ») et quand elles
 *   reviennent — personne ne se sent pris en otage ;
 * - le GAIN en une ligne : 2 -> 100 repas par jour, et « tout le reste reste
 *   gratuit » pour lever la crainte d'une app qui se ferme ;
 * - l'ANNUEL preselectionne, avec son economie CALCULEE sur les prix de la
 *   boutique (jamais codee en dur) et son equivalent mensuel ;
 * - un seul bouton, qui repete le prix de l'offre choisie : pas de surprise
 *   sur la feuille de paiement Google ;
 * - la reassurance a cote du bouton : sans engagement, resiliable dans
 *   Google Play. Les conditions de renouvellement sont affichees en clair,
 *   comme l'exige la politique Google Play sur les abonnements.
 *
 * Aucune logique de facturation ici : tout passe par subscriptionStore.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../ui/ScreenHeader';
import { Button } from '../ui/Button';
import { useColors } from '../../theme/useColors';
import type { ThemeColors } from '../../theme/palettes';
import { fonts } from '../../theme/fonts';
import { radius, spacing } from '../../theme/tokens';
import { useTranslation } from '../../i18n/useTranslation';
import {
  annualSavingsPercent,
  defaultPlanPeriod,
  pickPlans,
  type BillingErrorCode,
  type BillingPlan,
  type PlanPeriod,
} from '../../lib/billing';
import {
  FREE_DAILY_MEAL_PHOTO_LIMIT,
  PREMIUM_DAILY_MEAL_PHOTO_LIMIT,
} from '../../lib/mealPhotoQuota';
import { localTier, useSubscriptionStore } from '../../store/subscriptionStore';
import {
  PLAY_SUBSCRIPTIONS_URL,
  PRIVACY_POLICY_URL,
  SUBSCRIPTION_TERMS_URL,
} from '../../constants/legal';

export type PaywallReason = 'quota' | 'settings';

interface PaywallProps {
  reason: PaywallReason;
  onClose: () => void;
  /** Apres un achat reussi : l'appelant decide ou aller (souvent l'analyse). */
  onSubscribed?: () => void;
}

const ERROR_KEYS: Record<BillingErrorCode, string> = {
  unavailable: 'premium.error.unavailable',
  network: 'premium.error.network',
  pending: 'premium.error.pending',
  'not-allowed': 'premium.error.notAllowed',
  'already-owned': 'premium.error.alreadyOwned',
  store: 'premium.error.store',
  unknown: 'premium.error.unknown',
};

export function Paywall({ reason, onClose, onSubscribed }: PaywallProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { t, locale } = useTranslation();

  const entitlement = useSubscriptionStore((s) => s.entitlement);
  const plans = useSubscriptionStore((s) => s.plans);
  const plansState = useSubscriptionStore((s) => s.plansState);
  const init = useSubscriptionStore((s) => s.init);
  const loadPlans = useSubscriptionStore((s) => s.loadPlans);
  const purchase = useSubscriptionStore((s) => s.purchase);
  const restore = useSubscriptionStore((s) => s.restore);

  const pair = useMemo(() => pickPlans(plans), [plans]);
  const savings = annualSavingsPercent(pair.monthly, pair.annual);
  const [period, setPeriod] = useState<PlanPeriod | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [justSubscribed, setJustSubscribed] = useState(false);

  useEffect(() => {
    void init();
    void loadPlans();
  }, [init, loadPlans]);

  const selectedPeriod = period ?? defaultPlanPeriod(pair);
  const selected: BillingPlan | null = selectedPeriod ? pair[selectedPeriod] : null;
  const isPremium = localTier(entitlement) === 'premium';

  const openUrl = (url: string) => {
    if (url) void Linking.openURL(url);
  };

  const handlePurchase = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await purchase(selected.id);
      if (result.status === 'purchased') setJustSubscribed(true);
      else if (result.status === 'error') setMessage(t(ERROR_KEYS[result.code]));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const restored = await restore();
      if (restored === null) setMessage(t('premium.error.network'));
      else setMessage(t(restored.active ? 'premium.restoreDone' : 'premium.restoreNone'));
    } finally {
      setBusy(false);
    }
  };

  const closeButton = (
    <TouchableOpacity
      onPress={onClose}
      style={styles.closeBtn}
      hitSlop={8}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('premium.close')}
      testID="paywall-close">
      <Ionicons name="close" size={24} color={c.textPrimary} />
    </TouchableOpacity>
  );

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  // --- Abonne : etat et gestion, pas de vente --------------------------------
  if (isPremium || justSubscribed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader
          kicker={t('premium.kicker')}
          title={t(justSubscribed ? 'premium.successTitle' : 'premium.activeTitle')}
          right={closeButton}
        />
        <View style={styles.statusBody} testID="paywall-active">
          <Ionicons name="checkmark-circle" size={56} color={c.tertiary} />
          <Text style={styles.statusText}>
            {t(justSubscribed ? 'premium.successMessage' : 'premium.activeLimit', {
              count: PREMIUM_DAILY_MEAL_PHOTO_LIMIT,
            })}
          </Text>
          {!justSubscribed && entitlement.expiresAt ? (
            <Text style={styles.statusHint}>
              {t(entitlement.willRenew ? 'premium.activeRenews' : 'premium.activeEnds', {
                date: formatDate(entitlement.expiresAt),
              })}
            </Text>
          ) : null}
          {justSubscribed && onSubscribed ? (
            <Button title={t('premium.successAction')} onPress={onSubscribed} style={styles.fullWidth} />
          ) : (
            <Button
              title={t('premium.manage')}
              variant="secondary"
              onPress={() => openUrl(entitlement.managementUrl ?? PLAY_SUBSCRIPTIONS_URL)}
              style={styles.fullWidth}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // --- Offre --------------------------------------------------------------
  const planCard = (plan: BillingPlan) => {
    const active = plan.period === selectedPeriod;
    const annual = plan.period === 'annual';
    return (
      <TouchableOpacity
        key={plan.id}
        style={[styles.plan, active && styles.planActive]}
        onPress={() => setPeriod(plan.period)}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ checked: active }}
        testID={`paywall-plan-${plan.period}`}>
        <Ionicons
          name={active ? 'radio-button-on' : 'radio-button-off'}
          size={22}
          color={active ? c.primary : c.textMuted}
        />
        <View style={styles.planBody}>
          <View style={styles.planTitleRow}>
            <Text style={styles.planName}>{t(annual ? 'premium.planAnnual' : 'premium.planMonthly')}</Text>
            {annual && savings !== null ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t('premium.savings', { percent: savings })}</Text>
              </View>
            ) : null}
          </View>
          {annual && plan.pricePerMonthString ? (
            <Text style={styles.planHint}>
              {t('premium.annualMonthly', { price: plan.pricePerMonthString })}
            </Text>
          ) : null}
        </View>
        <Text style={styles.planPrice}>
          {t(annual ? 'premium.perYear' : 'premium.perMonth', { price: plan.priceString })}
        </Text>
      </TouchableOpacity>
    );
  };

  const ordered = [pair.annual, pair.monthly].filter((p): p is BillingPlan => p !== null);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader kicker={t('premium.kicker')} title={t('premium.title')} right={closeButton} />
      <ScrollView contentContainerStyle={styles.content}>
        {reason === 'quota' ? (
          <View style={styles.context} testID="paywall-context">
            <Ionicons name="time-outline" size={18} color={c.primary} />
            <Text style={styles.contextText}>
              {t('premium.quotaReached', { limit: FREE_DAILY_MEAL_PHOTO_LIMIT })}
            </Text>
          </View>
        ) : null}

        <Text style={styles.subtitle}>{t('premium.subtitle')}</Text>

        <View style={styles.compare}>
          <View style={[styles.compareRow, styles.compareDivider]}>
            <Text style={styles.compareLabel}>{t('premium.compareFree')}</Text>
            <Text style={styles.compareValue}>
              {t('premium.compareValue', { count: FREE_DAILY_MEAL_PHOTO_LIMIT })}
            </Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={[styles.compareLabel, styles.compareLabelStrong]}>{t('premium.comparePremium')}</Text>
            <Text style={[styles.compareValue, styles.compareValueStrong]}>
              {t('premium.compareValue', { count: PREMIUM_DAILY_MEAL_PHOTO_LIMIT })}
            </Text>
          </View>
        </View>
        <Text style={styles.compareRest}>{t('premium.compareRest')}</Text>

        {plansState === 'loading' || plansState === 'idle' ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={c.primary} />
            <Text style={styles.stateText}>{t('premium.loading')}</Text>
          </View>
        ) : plansState === 'error' ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{t('premium.loadError')}</Text>
            <Button title={t('premium.retry')} variant="secondary" compact onPress={() => void loadPlans()} />
          </View>
        ) : plansState === 'unavailable' || ordered.length === 0 ? (
          <View style={styles.stateBox} testID="paywall-unavailable">
            <Text style={styles.stateTitle}>{t('premium.unavailableTitle')}</Text>
            <Text style={styles.stateText}>
              {t('premium.unavailableMessage', { limit: FREE_DAILY_MEAL_PHOTO_LIMIT })}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.plans}>{ordered.map(planCard)}</View>

            <TouchableOpacity
              style={[styles.cta, (busy || !selected) && styles.ctaDisabled]}
              onPress={() => void handlePurchase()}
              disabled={busy || !selected}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel={t('premium.subscribe')}
              testID="paywall-subscribe">
              {busy ? (
                <ActivityIndicator color={c.primaryText} />
              ) : (
                <>
                  <Text style={styles.ctaTitle}>{t('premium.subscribe')}</Text>
                  {selected ? (
                    <Text style={styles.ctaSubtitle}>
                      {t(
                        selected.period === 'annual' ? 'premium.subscribeAnnual' : 'premium.subscribeMonthly',
                        { price: selected.priceString }
                      )}
                    </Text>
                  ) : null}
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.trust}>{t('premium.trust')}</Text>
          </>
        )}

        {message ? (
          <Text style={styles.message} testID="paywall-message">
            {message}
          </Text>
        ) : null}

        <Text style={styles.legal}>{t('premium.legal')}</Text>

        <View style={styles.links}>
          <TouchableOpacity onPress={() => void handleRestore()} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>{t('premium.restore')}</Text>
          </TouchableOpacity>
          {SUBSCRIPTION_TERMS_URL ? (
            <TouchableOpacity onPress={() => openUrl(SUBSCRIPTION_TERMS_URL)} hitSlop={8} accessibilityRole="link">
              <Text style={styles.link}>{t('premium.terms')}</Text>
            </TouchableOpacity>
          ) : null}
          {PRIVACY_POLICY_URL ? (
            <TouchableOpacity onPress={() => openUrl(PRIVACY_POLICY_URL)} hitSlop={8} accessibilityRole="link">
              <Text style={styles.link}>{t('premium.privacy')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, paddingBottom: 32, gap: spacing.sm },

    context: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: c.accentSoft,
    },
    contextText: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 13, lineHeight: 18, color: c.primary },
    subtitle: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: c.textSecondary },

    // Meme rangee a cases que les sous-actions de Nutrition.
    compare: { borderWidth: 1, borderColor: c.border, borderRadius: radius.md, overflow: 'hidden' },
    compareRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 48,
    },
    compareDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
    compareLabel: {
      fontFamily: fonts.serifBold,
      fontSize: 12,
      lineHeight: 15,
      letterSpacing: 0.96,
      textTransform: 'uppercase',
      color: c.textMuted,
    },
    compareValue: { flexShrink: 1, textAlign: 'right', fontFamily: fonts.sans, fontSize: 14, color: c.textMuted },
    compareLabelStrong: { color: c.textPrimary },
    compareValueStrong: { color: c.textPrimary, fontFamily: fonts.sansBold },
    compareRest: { fontFamily: fonts.sans, fontSize: 13, color: c.textSecondary },

    plans: { gap: spacing.xs, marginTop: spacing.xs },
    plan: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 72,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    planActive: { borderColor: c.primary, borderWidth: 2 },
    planBody: { flex: 1, gap: 2 },
    planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    planName: { fontFamily: fonts.serifBold, fontSize: 18, lineHeight: 22, color: c.textPrimary },
    planHint: { fontFamily: fonts.sans, fontSize: 13, color: c.textSecondary },
    planPrice: { fontFamily: fonts.sansBold, fontSize: 15, color: c.textPrimary },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: c.tertiary },
    badgeText: { fontFamily: fonts.sansBold, fontSize: 11, color: c.primaryText },

    // Forme du bouton d'action principal de l'accueil, en vert : c'est la
    // couleur de l'analyse photo, ce que l'abonnement debloque.
    cta: {
      minHeight: 72,
      marginTop: spacing.xs,
      paddingHorizontal: 20,
      paddingVertical: 14,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
      borderRadius: radius.lg,
      backgroundColor: c.tertiary,
    },
    ctaDisabled: { opacity: 0.6 },
    ctaTitle: { fontFamily: fonts.serifBold, fontSize: 24, lineHeight: 28, color: c.primaryText },
    ctaSubtitle: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: c.primaryText, opacity: 0.9 },
    trust: { textAlign: 'center', fontFamily: fonts.sansSemi, fontSize: 13, color: c.textSecondary },

    stateBox: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
    stateTitle: { fontFamily: fonts.serifBold, fontSize: 18, color: c.textPrimary, textAlign: 'center' },
    stateText: { fontFamily: fonts.sans, fontSize: 14, color: c.textSecondary, textAlign: 'center' },

    message: { textAlign: 'center', fontFamily: fonts.sansSemi, fontSize: 13, color: c.primary },
    legal: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: c.textMuted, marginTop: spacing.xs },
    links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
    // Meme lien que « Historique » sur Progression : capitales espacees.
    link: {
      fontFamily: fonts.sansSemi,
      fontSize: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: c.primary,
    },

    statusBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
    statusText: { fontFamily: fonts.sansSemi, fontSize: 16, color: c.textPrimary, textAlign: 'center' },
    statusHint: { fontFamily: fonts.sans, fontSize: 14, color: c.textSecondary, textAlign: 'center' },
    fullWidth: { alignSelf: 'stretch' },
  });
