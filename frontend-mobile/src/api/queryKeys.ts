import type { NotificationListQuery, SubscriptionListQuery } from './types';

/**
 * Central TanStack Query keys. Invalidate by prefix, e.g. after saving a subscription:
 * `queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all })`.
 */
export const queryKeys = {
  me: ['me'] as const,
  plan: ['me', 'plan'] as const,
  notificationSettings: ['me', 'notification-settings'] as const,
  dashboard: ['dashboard'] as const,
  subscriptions: {
    all: ['subscriptions'] as const,
    list: (query: SubscriptionListQuery = {}) => ['subscriptions', 'list', query] as const,
    detail: (id: string) => ['subscriptions', 'detail', id] as const,
    cancellationGuide: (id: string) => ['subscriptions', 'detail', id, 'cancellation-guide'] as const,
  },
  calendar: (from: string, to: string) => ['calendar', from, to] as const,
  insights: ['insights'] as const,
  notifications: {
    all: ['notifications'] as const,
    list: (query: NotificationListQuery = {}) => ['notifications', 'list', query] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  catalog: (search = '') => ['catalog', search] as const,
  catalogService: (id: string) => ['catalog', 'service', id] as const,
  plans: ['plans'] as const,
  meta: ['meta'] as const,
};

/** Everything that depends on the user's subscriptions; invalidate after any subscription change. */
export const subscriptionDependentKeys = [
  queryKeys.subscriptions.all,
  queryKeys.dashboard,
  ['calendar'] as const,
  queryKeys.insights,
  queryKeys.plan,
];
