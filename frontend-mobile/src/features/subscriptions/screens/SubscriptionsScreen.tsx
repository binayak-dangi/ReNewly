import React, { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import type { SubscriptionSort, SubscriptionStatusFilter } from '../../../api/types';
import type { TabScreenProps } from '../../../app/navigation/types';
import {
  AppText,
  Badge,
  Button,
  Card,
  ChipGroup,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  ListRow,
  Screen,
  ServiceAvatar,
  Skeleton,
} from '../../../components';
import { ArrowUpDown, Inbox, Plus, Search, X } from '../../../components/icons';
import { colors, radii, spacing, typography } from '../../../theme';
import { formatDate, formatMoneyList, formatPrice } from '../../../utils/format';
import { RenewalRow } from '../components/RenewalRow';
import { useMyPlan, useSubscriptions } from '../hooks';

const FILTERS: { value: SubscriptionStatusFilter; label: string }[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'All', label: 'All' },
];

const SORTS: { value: SubscriptionSort; label: string }[] = [
  { value: 'RenewalDate', label: 'Next renewal' },
  { value: 'PriceHighToLow', label: 'Price (high to low)' },
  { value: 'Name', label: 'Name (A–Z)' },
];

function Separator() {
  return <Divider inset={spacing.lg} />;
}

export function SubscriptionsScreen({ navigation }: TabScreenProps<'Subscriptions'>) {
  const [status, setStatus] = useState<SubscriptionStatusFilter>('Active');
  const [sort, setSort] = useState<SubscriptionSort>('RenewalDate');
  const [search, setSearch] = useState('');
  const query = useMemo(() => ({ status, sort }), [status, sort]);
  const { data, error, isPending, isRefetching, refetch } = useSubscriptions(query);
  const plan = useMyPlan();

  // Search is local: the list is small and this keeps typing instant (also offline).
  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter(
      s => !term || s.serviceName.toLowerCase().includes(term) || s.planName?.toLowerCase().includes(term),
    );
  }, [data, search]);

  const activeMonthly = useMemo(() => {
    const byCurrency = new Map<string, number>();
    (data ?? [])
      .filter(s => s.status === 'Active')
      .forEach(s => byCurrency.set(s.currency, (byCurrency.get(s.currency) ?? 0) + s.monthlyCost));
    return [...byCurrency].map(([currency, amount]) => ({ currency, amount }));
  }, [data]);

  const add = () => {
    const p = plan.data;
    if (p?.remainingSubscriptions === 0) {
      Alert.alert(
        'Free plan limit reached',
        `You're tracking ${p.activeSubscriptions} of ${p.entitlements.maxSubscriptions} subscriptions. Upgrade to Pro for unlimited subscriptions, or mark one you no longer use as cancelled.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'See Pro', onPress: () => navigation.navigate('Premium') },
        ],
      );
      return;
    }
    navigation.navigate('ServicePicker');
  };

  const chooseSort = () =>
    Alert.alert('Sort by', undefined, [
      ...SORTS.map(option => ({
        text: option.value === sort ? `✓ ${option.label}` : option.label,
        onPress: () => setSort(option.value),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <AppText variant="title" accessibilityRole="header" style={styles.flex}>
          Subscriptions
        </AppText>
        <IconButton icon={ArrowUpDown} accessibilityLabel={`Sort, currently ${SORTS.find(s => s.value === sort)?.label}`} onPress={chooseSort} />
        <IconButton icon={Plus} accessibilityLabel="Add subscription" color={colors.primary} onPress={add} />
      </View>
      <View style={styles.search}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search subscriptions"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Search subscriptions"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {search ? <IconButton icon={X} size={18} accessibilityLabel="Clear search" onPress={() => setSearch('')} /> : null}
      </View>
      <ChipGroup<SubscriptionStatusFilter> options={FILTERS} value={status} onChange={setStatus} accessibilityLabel="Filter by status" />
      {status === 'Active' && activeMonthly.length > 0 ? (
        <AppText variant="label" tone="secondary">
          {data?.length ?? 0} active · {formatMoneyList(activeMonthly)} per month
        </AppText>
      ) : null}
    </View>
  );

  if (isPending) {
    return (
      <Screen edges={['top', 'left', 'right']} scroll={false} header={header}>
        <Card padding="none">
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={40} height={40} radius={12} />
              <View style={styles.flex}>
                <Skeleton width="55%" height={16} />
                <Skeleton width="35%" height={12} style={styles.skeletonGap} />
              </View>
            </View>
          ))}
        </Card>
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

  return (
    <Screen edges={['top', 'left', 'right']} scroll={false} padded={false} header={header}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
            }}
            colors={[colors.primary]}
          />
        }
        ItemSeparatorComponent={Separator}
        renderItem={({ item, index }) => {
          const first = index === 0;
          const last = index === items.length - 1;
          const open = () => navigation.navigate('SubscriptionDetail', { id: item.id });
          return (
            <View style={[styles.item, first && styles.itemFirst, last && styles.itemLast]}>
              {item.status === 'Active' ? (
                <RenewalRow
                  serviceName={item.serviceName}
                  brandColor={item.brandColor}
                  planName={item.planName}
                  price={item.price}
                  currency={item.currency}
                  renewalDate={item.nextRenewalDate}
                  daysRemaining={item.daysUntilRenewal}
                  onPress={open}
                />
              ) : (
                <ListRow
                  title={item.serviceName}
                  subtitle={`${formatPrice(item.price, item.currency, item.billingCycle)}${
                    item.cancelledAtUtc ? ` · cancelled ${formatDate(item.cancelledAtUtc.slice(0, 10), 'MMM d')}` : ''
                  }`}
                  leading={<ServiceAvatar name={item.serviceName} brandColor={item.brandColor} size={40} />}
                  trailing={<Badge label="Cancelled" />}
                  showChevron={false}
                  onPress={open}
                />
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          search ? (
            <EmptyState icon={Search} title="No matches" message={`Nothing matches "${search.trim()}".`} />
          ) : status === 'Cancelled' ? (
            <EmptyState
              icon={Inbox}
              title="Nothing cancelled yet"
              message="When you cancel a subscription with its provider, mark it as cancelled here to stop reminders."
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title="No subscriptions yet"
              message="Add the services you pay for and Renewly will remind you before each one renews."
              actionLabel="Add subscription"
              onAction={add}
            />
          )
        }
        ListFooterComponent={
          items.length > 0 && status !== 'Cancelled' ? (
            <Button title="Add subscription" variant="secondary" icon={Plus} onPress={add} style={styles.footerButton} />
          ) : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingLeft: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  searchInput: { ...typography.body, flex: 1, color: colors.text, paddingVertical: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, flexGrow: 1 },
  item: {
    backgroundColor: colors.card,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  itemLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  footerButton: { marginTop: spacing.lg },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  skeletonGap: { marginTop: spacing.sm },
});
