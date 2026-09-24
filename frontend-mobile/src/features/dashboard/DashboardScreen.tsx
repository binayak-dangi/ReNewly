import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { TabScreenProps } from '../../app/navigation/types';
import {
  AppText,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  ListRow,
  Screen,
  SectionHeader,
} from '../../components';
import { Bell, BellRing, Crown, Inbox, Plus } from '../../components/icons';
import { useAuthStore } from '../../store/authStore';
import { colors, radii, shadows, spacing } from '../../theme';
import { formatDate, formatDateTime, formatMoneyList } from '../../utils/format';
import { RenewalRow } from '../subscriptions/components/RenewalRow';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { NextRenewalCard } from './components/NextRenewalCard';
import { useDashboard } from './useDashboard';

function greeting(date = new Date()): string {
  const hour = date.getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function DashboardScreen({ navigation }: TabScreenProps<'Home'>) {
  const user = useAuthStore(s => s.user);
  const { data, error, isPending, isRefetching, refetch } = useDashboard();

  const addSubscription = () => {
    if (data?.plan.limitReached) {
      Alert.alert(
        'Free plan limit reached',
        `You're tracking ${data.plan.activeSubscriptions} of ${data.plan.maxSubscriptions} subscriptions on the Free plan. Upgrade to Pro for unlimited subscriptions, or mark one you no longer use as cancelled.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'See Pro', onPress: () => navigation.navigate('Premium') },
        ],
      );
      return;
    }
    navigation.navigate('ServicePicker');
  };

  const firstName = user?.fullName.split(' ')[0];
  const header = (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <AppText variant="title" accessibilityRole="header">
          {firstName ? `${greeting()}, ${firstName}` : greeting()}
        </AppText>
        <AppText variant="label" tone="secondary">
          {formatDate(data?.today ?? new Date(), 'EEEE, MMMM d')}
        </AppText>
      </View>
      <IconButton
        icon={Bell}
        accessibilityLabel={
          data?.unreadNotifications ? `Notifications, ${data.unreadNotifications} unread` : 'Notifications'
        }
        badgeCount={data?.unreadNotifications}
        onPress={() => navigation.navigate('Notifications')}
      />
    </View>
  );

  if (isPending) {
    return (
      <Screen edges={['top', 'left', 'right']} header={header}>
        <DashboardSkeleton />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen edges={['top', 'left', 'right']} header={header}>
        <ErrorState error={error} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const hasSubscriptions = data.activeSubscriptions > 0;

  return (
    <View style={styles.flex}>
      <Screen
        edges={['top', 'left', 'right']}
        header={header}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        contentStyle={styles.content}>
        {!hasSubscriptions ? (
          <EmptyState
            icon={Inbox}
            title="No subscriptions yet"
            message="Add the services you pay for and Renewly will remind you before each one renews."
            actionLabel="Add your first subscription"
            onAction={addSubscription}
          />
        ) : (
          <>
            {data.nextRenewal ? (
              <NextRenewalCard
                renewal={data.nextRenewal}
                onOpen={() => navigation.navigate('SubscriptionDetail', { id: data.nextRenewal!.subscriptionId })}
                onCancelHelp={() =>
                  navigation.navigate('CancellationAssistance', { id: data.nextRenewal!.subscriptionId })
                }
              />
            ) : null}

            <View style={styles.stats}>
              <Stat label="Per month" value={formatMoneyList(data.monthlySpend)} />
              <Stat label="Per year" value={formatMoneyList(data.yearlySpend)} />
              <Stat label="Active" value={String(data.activeSubscriptions)} />
            </View>

            {data.dueNext7Days.some(m => m.amount > 0) ? (
              <Card padding="md" style={styles.dueCard}>
                <BellRing size={18} color={colors.warning} />
                <AppText variant="label" style={styles.flex}>
                  <AppText variant="label" numeric style={styles.bold}>
                    {formatMoneyList(data.dueNext7Days)}
                  </AppText>{' '}
                  due in the next 7 days
                </AppText>
              </Card>
            ) : null}

            {data.upcomingRenewals.length > 0 ? (
              <>
                <SectionHeader
                  title="Upcoming renewals"
                  action={
                    <Button
                      title="Calendar"
                      variant="ghost"
                      size="md"
                      fullWidth={false}
                      onPress={() => navigation.navigate('Calendar')}
                    />
                  }
                />
                <Card padding="none">
                  {data.upcomingRenewals.map((renewal, index) => (
                    <View key={`${renewal.subscriptionId}-${renewal.renewalDate}`}>
                      {index > 0 ? <Divider inset={spacing.lg} /> : null}
                      <RenewalRow
                        {...renewal}
                        onPress={() => navigation.navigate('SubscriptionDetail', { id: renewal.subscriptionId })}
                      />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            {data.plan.tier === 'Free' && data.plan.maxSubscriptions ? (
              <PlanUsageCard
                used={data.plan.activeSubscriptions}
                max={data.plan.maxSubscriptions}
                onUpgrade={() => navigation.navigate('Premium')}
              />
            ) : null}

            {data.recentNotifications.length > 0 ? (
              <>
                <SectionHeader
                  title="Recent notifications"
                  action={
                    <Button
                      title="See all"
                      variant="ghost"
                      size="md"
                      fullWidth={false}
                      onPress={() => navigation.navigate('Notifications')}
                    />
                  }
                />
                <Card padding="none">
                  {data.recentNotifications.slice(0, 3).map((n, index) => (
                    <View key={n.id}>
                      {index > 0 ? <Divider inset={spacing.lg} /> : null}
                      <ListRow
                        title={n.title}
                        subtitle={formatDateTime(n.createdAtUtc)}
                        icon={BellRing}
                        onPress={
                          n.subscriptionId
                            ? () => navigation.navigate('SubscriptionDetail', { id: n.subscriptionId! })
                            : undefined
                        }
                      />
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
          </>
        )}
      </Screen>

      {hasSubscriptions ? (
        <Pressable
          onPress={addSubscription}
          accessibilityRole="button"
          accessibilityLabel="Add subscription"
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
          <Plus size={26} color={colors.onPrimary} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="md" style={styles.stat}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="bodyStrong" numeric numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </AppText>
    </Card>
  );
}

function PlanUsageCard({ used, max, onUpgrade }: { used: number; max: number; onUpgrade(): void }) {
  const ratio = Math.min(1, used / max);
  return (
    <Card>
      <View style={styles.planRow}>
        <Crown size={20} color={colors.primary} />
        <AppText variant="bodyStrong" style={styles.flex}>
          {used} of {max} free subscriptions used
        </AppText>
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: used }}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }, ratio >= 1 && styles.fillFull]} />
      </View>
      <Button title="Upgrade to Pro" variant="secondary" size="md" onPress={onUpgrade} style={styles.planButton} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 96 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
  },
  headerText: { flex: 1, gap: spacing.xxs },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: spacing.xs },
  dueCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warningSoft },
  bold: { fontWeight: '700' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.disabledSoft,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
  fillFull: { backgroundColor: colors.warning },
  planButton: { marginTop: spacing.md },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
  },
  fabPressed: { backgroundColor: colors.primaryPressed },
});
