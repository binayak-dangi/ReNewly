import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { insightsApi } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import type { Insights, Money } from '../../api/types';
import type { TabScreenProps } from '../../app/navigation/types';
import {
  AppText,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  ListRow,
  Screen,
  SectionHeader,
  ServiceAvatar,
  Skeleton,
} from '../../components';
import { ChartPie, Crown, Sparkles } from '../../components/icons';
import { colors, radii, spacing } from '../../theme';
import { billingCycleLabel, formatMoney, formatMoneyList } from '../../utils/format';
import { categoryLabel } from '../subscriptions/labels';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function InsightsScreen({ navigation }: TabScreenProps<'Insights'>) {
  const { data, error, isPending, isRefetching, refetch } = useQuery({ queryKey: queryKeys.insights, queryFn: insightsApi.get });

  const title = (
    <AppText variant="title" accessibilityRole="header">
      Insights
    </AppText>
  );

  if (isPending) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        {title}
        <View style={styles.statsGrid}>
          {[0, 1, 2, 3].map(i => (
            <Card key={i} style={styles.statCard}>
              <Skeleton width="50%" height={12} />
              <Skeleton width="75%" height={22} style={styles.gap} />
            </Card>
          ))}
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        {title}
        <ErrorState error={error} onRetry={() => refetch()} />
      </Screen>
    );
  }

  if (data.activeSubscriptions === 0) {
    return (
      <Screen edges={['top', 'left', 'right']}>
        {title}
        <EmptyState
          icon={ChartPie}
          title="No insights yet"
          message="Add your subscriptions to see what you spend each month and where it goes."
          actionLabel="Add subscription"
          onAction={() => navigation.navigate('ServicePicker')}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right']} refreshing={isRefetching} onRefresh={() => refetch()}>
      {title}

      <View style={styles.statsGrid}>
        <Stat label="Per month" value={formatMoneyList(data.monthlySpend)} />
        <Stat label="Per year (estimated)" value={formatMoneyList(data.yearlySpend)} />
        <Stat label="Active subscriptions" value={String(data.activeSubscriptions)} />
        <Stat
          label={`Next 30 days · ${data.upcomingRenewalCount30Days} renewal${data.upcomingRenewalCount30Days === 1 ? '' : 's'}`}
          value={formatMoneyList(data.upcomingRenewalAmount30Days)}
        />
      </View>

      <SectionHeader title="Spending by category" />
      <Card>
        <View style={styles.bars}>
          {data.spendingByCategory.map(c => (
            <View key={`${c.category}-${c.currency}`} style={styles.barGroup}>
              <View style={styles.barLabelRow}>
                <AppText variant="label" style={styles.flex}>
                  {categoryLabel(c.category)}
                  <AppText variant="caption" tone="muted">
                    {'  '}
                    {c.subscriptionCount} · {c.sharePercent}%
                  </AppText>
                </AppText>
                <AppText variant="label" numeric>
                  {formatMoney(c.monthlyAmount, c.currency)}/mo
                </AppText>
              </View>
              <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={[styles.fill, { width: `${Math.max(2, c.sharePercent)}%` }]} />
              </View>
            </View>
          ))}
        </View>
        {hasMixedCurrencies(data.monthlySpend) ? (
          <AppText variant="caption" tone="muted" style={styles.gap}>
            Shares are calculated within each currency. Renewly doesn't convert between currencies.
          </AppText>
        ) : null}
      </Card>

      {data.advanced ? (
        <AdvancedInsights advanced={data.advanced} currency={data.preferredCurrency} onOpen={id => navigation.navigate('SubscriptionDetail', { id })} />
      ) : (
        <Card tone="primary">
          <View style={styles.proRow}>
            <Crown size={22} color={colors.primary} />
            <AppText variant="headline" style={styles.flex}>
              Advanced insights
            </AppText>
          </View>
          <AppText tone="secondary" style={styles.gap}>
            See a 12-month spending forecast, your most expensive subscriptions and your billing-cycle mix with Renewly
            Pro.
          </AppText>
          <Button title="Unlock with Pro" icon={Sparkles} onPress={() => navigation.navigate('Premium')} style={styles.gapLg} />
        </Card>
      )}
    </Screen>
  );
}

function AdvancedInsights({
  advanced,
  currency,
  onOpen,
}: {
  advanced: NonNullable<Insights['advanced']>;
  currency: string;
  onOpen(id: string): void;
}) {
  const amountFor = (totals: Money[]) => totals.find(t => t.currency === currency)?.amount ?? 0;
  const max = Math.max(1, ...advanced.twelveMonthForecast.map(m => amountFor(m.totals)));

  return (
    <>
      <SectionHeader title={`12-month forecast (${currency})`} />
      <Card>
        <View style={styles.chart} accessibilityLabel="Spending forecast by month">
          {advanced.twelveMonthForecast.map(m => {
            const amount = amountFor(m.totals);
            return (
              <View
                key={`${m.year}-${m.month}`}
                style={styles.chartCol}
                accessible
                accessibilityLabel={`${MONTHS[m.month - 1]} ${m.year}: ${formatMoney(amount, currency)}`}>
                <View style={styles.chartBarArea}>
                  <View style={[styles.chartBar, { height: `${Math.max(2, (amount / max) * 100)}%` }]} />
                </View>
                <AppText variant="caption" tone="muted" style={styles.chartLabel}>
                  {MONTHS[m.month - 1][0]}
                </AppText>
              </View>
            );
          })}
        </View>
        <AppText variant="caption" tone="muted" style={styles.gap}>
          Highest month: {formatMoney(max, currency)}
        </AppText>
      </Card>

      <SectionHeader title="Most expensive" />
      <Card padding="none">
        {advanced.topSubscriptions.map((t, i) => (
          <View key={t.subscriptionId}>
            {i > 0 ? <Divider inset={spacing.lg} /> : null}
            <ListRow
              title={t.serviceName}
              subtitle={`${t.sharePercent}% of ${t.currency} spend`}
              leading={<ServiceAvatar name={t.serviceName} brandColor={t.brandColor} size={36} />}
              trailing={`${formatMoney(t.monthlyCost, t.currency)}/mo`}
              onPress={() => onOpen(t.subscriptionId)}
              showChevron={false}
            />
          </View>
        ))}
      </Card>

      <SectionHeader title="Billing cycles" />
      <Card padding="none">
        {advanced.billingCycleMix.map((b, i) => (
          <View key={b.billingCycle}>
            {i > 0 ? <Divider inset={spacing.lg} /> : null}
            <ListRow title={billingCycleLabel(b.billingCycle)} trailing={String(b.subscriptionCount)} />
          </View>
        ))}
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.statCard}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="headline" numeric numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.gapSm}>
        {value}
      </AppText>
    </Card>
  );
}

const hasMixedCurrencies = (totals: Money[]) => totals.filter(t => t.amount > 0).length > 1;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { marginTop: spacing.sm },
  gapSm: { marginTop: spacing.xs },
  gapLg: { marginTop: spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { flexBasis: '47%', flexGrow: 1 },
  bars: { gap: spacing.lg },
  barGroup: { gap: spacing.xs },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.disabledSoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: spacing.xs },
  chartCol: { flex: 1, alignItems: 'center', height: '100%' },
  chartBarArea: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: colors.primary },
  chartLabel: { marginTop: spacing.xs },
});
