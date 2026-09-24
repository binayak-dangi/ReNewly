import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { notificationsApi } from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import type { AppNotification, NotificationListQuery } from '../../api/types';
import type { RootScreenProps } from '../../app/navigation/types';
import { AppText, Badge, ChipGroup, EmptyState, ErrorState, IconButton, Screen, Skeleton, toast } from '../../components';
import { BellOff, BellRing, CheckCheck, CircleAlert, Mail } from '../../components/icons';
import { colors, radii, spacing } from '../../theme';
import { formatDateTime } from '../../utils/format';

type Filter = 'all' | 'unread' | 'failed';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'failed', label: 'Failed' },
];

const PAGE_SIZE = 20;

function toQuery(filter: Filter): NotificationListQuery {
  return filter === 'unread' ? { unreadOnly: true } : filter === 'failed' ? { status: 'Failed' } : {};
}

export function NotificationsScreen({ navigation }: RootScreenProps<'Notifications'>) {
  const [filter, setFilter] = useState<Filter>('all');
  const queryClient = useQueryClient();
  const baseQuery = useMemo(() => toQuery(filter), [filter]);

  const list = useInfiniteQuery({
    queryKey: queryKeys.notifications.list(baseQuery),
    queryFn: ({ pageParam }) => notificationsApi.list({ ...baseQuery, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: last => (last.hasMore ? last.page + 1 : undefined),
  });

  const refreshCounts = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };

  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refreshCounts });
  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      refreshCounts();
      toast.success('All caught up.');
    },
  });

  const items = useMemo(() => list.data?.pages.flatMap(p => p.items) ?? [], [list.data]);
  const hasUnread = items.some(n => !n.isRead);

  // `mutate` is stable across renders; the mutation object itself is not.
  const markAll = markAllRead.mutate;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: hasUnread ? markAllButton(() => markAll()) : undefined,
    });
  }, [navigation, hasUnread, markAll]);

  const open = (n: AppNotification) => {
    if (!n.isRead) {
      markRead.mutate(n.id);
    }
    if (n.subscriptionId) {
      navigation.navigate('SubscriptionDetail', { id: n.subscriptionId });
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} scroll={false} padded={false}>
      <View style={styles.filters}>
        <ChipGroup<Filter> options={FILTERS} value={filter} onChange={setFilter} accessibilityLabel="Filter notifications" />
      </View>

      {list.isPending ? (
        <View style={styles.padded}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={styles.skeleton}>
              <Skeleton width={36} height={36} radius={18} />
              <View style={styles.flex}>
                <Skeleton width="70%" height={16} />
                <Skeleton width="45%" height={12} style={styles.gap} />
              </View>
            </View>
          ))}
        </View>
      ) : !list.data ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) {
              list.fetchNextPage();
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching && !list.isFetchingNextPage}
              onRefresh={() => {
                list.refetch();
              }}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => <NotificationRow notification={item} onPress={() => open(item)} />}
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.gap} /> : undefined}
          ListEmptyComponent={
            <EmptyState
              icon={BellOff}
              title={filter === 'all' ? 'No notifications yet' : filter === 'unread' ? "You're all caught up" : 'No failed notifications'}
              message={
                filter === 'all'
                  ? 'Renewal reminders will appear here, even if a push notification could not be delivered.'
                  : undefined
              }
            />
          }
        />
      )}
    </Screen>
  );
}

function markAllButton(onPress: () => void) {
  return function MarkAllReadButton() {
    return <IconButton icon={CheckCheck} accessibilityLabel="Mark all as read" color={colors.primary} onPress={onPress} />;
  };
}

function NotificationRow({ notification: n, onPress }: { notification: AppNotification; onPress(): void }) {
  const failed = n.status === 'Failed';
  const Icon = failed ? CircleAlert : n.channel === 'Email' ? Mail : BellRing;
  const statusLabel = failed ? 'Not delivered' : n.status === 'Pending' ? 'Sending' : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${n.isRead ? '' : 'Unread. '}${n.title}. ${n.body.replace(/\n/g, '. ')}`}
      android_ripple={{ color: colors.ripple }}
      style={({ pressed }) => [styles.row, !n.isRead && styles.unread, pressed && Platform.OS === 'ios' && styles.pressed]}>
      <View style={[styles.icon, failed ? styles.iconFailed : null]}>
        <Icon size={18} color={failed ? colors.danger : colors.primary} />
      </View>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <AppText variant={n.isRead ? 'body' : 'bodyStrong'} style={styles.flex} numberOfLines={2}>
            {n.title}
          </AppText>
          {!n.isRead ? <View style={styles.unreadDot} /> : null}
        </View>
        <AppText variant="label" tone="secondary" numberOfLines={3}>
          {n.body}
        </AppText>
        <View style={styles.metaRow}>
          <AppText variant="caption" tone="muted">
            {formatDateTime(n.createdAtUtc)} · {n.channel === 'Email' ? 'Email' : 'Push'}
          </AppText>
          {statusLabel ? <Badge label={statusLabel} tone={failed ? 'danger' : 'info'} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { marginTop: spacing.sm },
  padded: { padding: spacing.lg, gap: spacing.lg },
  filters: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.background },
  list: { flexGrow: 1, paddingBottom: spacing.xxxl },
  skeleton: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  unread: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.8 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFailed: { backgroundColor: colors.dangerSoft },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' },
});
