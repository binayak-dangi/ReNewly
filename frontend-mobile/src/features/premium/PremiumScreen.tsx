import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { plansApi } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import type { SubscriptionPlan } from '../../api/types';
import { AppText, Badge, Button, Card, ErrorState, FormMessage, LoadingState, Screen } from '../../components';
import { BadgeCheck, CircleCheck, Crown, X } from '../../components/icons';
import { billing } from '../../services/billing/BillingProvider';
import { colors, radii, spacing } from '../../theme';
import { formatDate, formatMoney } from '../../utils/format';
import { useMyPlan } from '../subscriptions/hooks';

interface FeatureRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
}

function featureRows(free?: SubscriptionPlan, pro?: SubscriptionPlan): FeatureRow[] {
  return [
    {
      label: 'Subscriptions tracked',
      free: free?.maxSubscriptions ? `Up to ${free.maxSubscriptions}` : 'Unlimited',
      pro: pro?.maxSubscriptions ? `Up to ${pro.maxSubscriptions}` : 'Unlimited',
    },
    {
      label: 'Reminders per subscription',
      free: String(free?.maxRemindersPerSubscription ?? 1),
      pro: `Up to ${pro?.maxRemindersPerSubscription ?? 3}`,
    },
    { label: 'Push reminders', free: true, pro: true },
    { label: 'Email reminders', free: !!free?.emailRemindersEnabled, pro: pro?.emailRemindersEnabled ?? true },
    { label: 'Advanced insights', free: !!free?.advancedAnalyticsEnabled, pro: pro?.advancedAnalyticsEnabled ?? true },
    { label: 'Receipt storage', free: !!free?.receiptStorageEnabled, pro: pro?.receiptStorageEnabled ?? true },
    { label: 'Cloud sync', free: !!free?.cloudSyncEnabled, pro: pro?.cloudSyncEnabled ?? true },
    { label: 'No ads', free: !free?.adsEnabled, pro: !(pro?.adsEnabled ?? false) },
  ];
}

export function PremiumScreen() {
  const plans = useQuery({ queryKey: queryKeys.plans, queryFn: plansApi.list, staleTime: 60 * 60 * 1000 });
  const myPlan = useMyPlan();
  const billingAvailable = useQuery({ queryKey: ['billing', 'available'], queryFn: () => billing.isAvailable() });
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const free = plans.data?.find(p => p.tier === 'Free');
  const proPlans = useMemo(() => (plans.data ?? []).filter(p => p.tier === 'Pro'), [plans.data]);
  const monthly = proPlans.find(p => p.billingCycle === 'Monthly');
  const selected = proPlans.find(p => p.code === selectedCode) ?? proPlans.find(p => p.billingCycle === 'Yearly') ?? proPlans[0];

  if (plans.isPending || myPlan.isPending) {
    return <LoadingState />;
  }
  if (!plans.data) {
    return <ErrorState error={plans.error} onRetry={() => plans.refetch()} />;
  }

  const entitlements = myPlan.data?.entitlements;
  const isPro = entitlements?.isPro ?? false;
  const rows = featureRows(free, proPlans[0]);

  const yearlySavings = (plan: SubscriptionPlan) =>
    monthly && plan.billingCycle === 'Yearly' && monthly.price > 0
      ? Math.round((1 - plan.price / (monthly.price * 12)) * 100)
      : null;

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      footer={
        isPro || !selected ? null : (
          <>
            <Button
              title={billingAvailable.data ? `Continue with ${selected.name}` : 'Coming soon'}
              icon={Crown}
              disabled={!billingAvailable.data}
              onPress={() => billing.purchase(selected.googlePlayProductId ?? selected.code)}
            />
            {!billingAvailable.data ? (
              <AppText variant="caption" tone="muted" align="center">
                In-app purchases are coming soon. Your plan is billed and managed by Google Play.
              </AppText>
            ) : null}
          </>
        )
      }>
      <View style={styles.hero}>
        <View style={styles.crown}>
          <Crown size={30} color={colors.primary} />
        </View>
        <AppText variant="title" align="center" accessibilityRole="header">
          {isPro ? "You're on Renewly Pro" : 'Never miss a renewal'}
        </AppText>
        <AppText tone="secondary" align="center">
          {isPro
            ? `Thanks for supporting Renewly.${entitlements?.expiresAtUtc ? ` Your plan renews or ends on ${formatDate(entitlements.expiresAtUtc.slice(0, 10))}.` : ''}`
            : 'Unlimited subscriptions, reminders 7, 3 and 1 day before by push and email, and deeper insights.'}
        </AppText>
      </View>

      {isPro ? (
        <FormMessage tone="info" message="To change or cancel Renewly Pro, open Google Play → Payments & subscriptions → Subscriptions." />
      ) : null}

      <Card padding="none">
        <View style={[styles.tableRow, styles.tableHead]}>
          <AppText variant="label" tone="secondary" style={styles.featureCol}>
            Feature
          </AppText>
          <AppText variant="label" tone="secondary" align="center" style={styles.planCol}>
            Free
          </AppText>
          <AppText variant="label" tone="primary" align="center" style={[styles.planCol, styles.bold]}>
            Pro
          </AppText>
        </View>
        {rows.map(row => (
          <View key={row.label} style={styles.tableRow} accessible accessibilityLabel={`${row.label}: Free ${cellText(row.free)}, Pro ${cellText(row.pro)}`}>
            <AppText variant="label" style={styles.featureCol}>
              {row.label}
            </AppText>
            <Cell value={row.free} />
            <Cell value={row.pro} pro />
          </View>
        ))}
      </Card>

      {!isPro && proPlans.length > 0 ? (
        <View style={styles.plans} accessibilityRole="radiogroup">
          {proPlans.map(plan => {
            const isSelected = plan.code === selected?.code;
            const savings = yearlySavings(plan);
            return (
              <Pressable
                key={plan.code}
                onPress={() => setSelectedCode(plan.code)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${plan.name}, ${formatMoney(plan.price, plan.currency)} per ${plan.billingCycle === 'Yearly' ? 'year' : 'month'}`}
                style={[styles.planCard, isSelected && styles.planCardSelected]}>
                <View style={styles.planHeader}>
                  <AppText variant="bodyStrong" style={styles.flex}>
                    {plan.name}
                  </AppText>
                  {savings && savings > 0 ? <Badge label={`Save ${savings}%`} tone="success" /> : null}
                </View>
                <AppText variant="headline" numeric>
                  {formatMoney(plan.price, plan.currency)}
                  <AppText variant="label" tone="secondary">
                    {plan.billingCycle === 'Yearly' ? ' / year' : ' / month'}
                  </AppText>
                </AppText>
                {plan.billingCycle === 'Yearly' ? (
                  <AppText variant="caption" tone="muted">
                    {formatMoney(plan.price / 12, plan.currency)} per month, billed yearly
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
          <AppText variant="caption" tone="muted" align="center">
            Prices shown are indicative. The final price in your currency is shown by Google Play before you pay. Cancel
            anytime in Google Play.
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const cellText = (value: string | boolean) => (typeof value === 'string' ? value : value ? 'included' : 'not included');

function Cell({ value, pro }: { value: string | boolean; pro?: boolean }) {
  if (typeof value === 'string') {
    return (
      <AppText variant="label" align="center" tone={pro ? 'primary' : 'default'} style={styles.planCol}>
        {value}
      </AppText>
    );
  }
  return (
    <View style={[styles.planCol, styles.center]}>
      {value ? (
        pro ? <BadgeCheck size={20} color={colors.primary} /> : <CircleCheck size={20} color={colors.textSecondary} />
      ) : (
        <X size={18} color={colors.borderStrong} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  crown: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableHead: { backgroundColor: colors.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  featureCol: { flex: 2 },
  planCol: { flex: 1 },
  plans: { gap: spacing.md },
  planCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  planCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
