import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogApi, meApi, metaApi, subscriptionsApi } from '../../api/endpoints';
import { queryKeys, subscriptionDependentKeys } from '../../api/queryKeys';
import type { SaveSubscriptionRequest, SubscriptionDetail, SubscriptionListQuery } from '../../api/types';

const ONE_HOUR = 60 * 60 * 1000;

export function useSubscriptions(query: SubscriptionListQuery) {
  return useQuery({
    queryKey: queryKeys.subscriptions.list(query),
    queryFn: () => subscriptionsApi.list(query),
    placeholderData: previous => previous, // keep the list on screen while filters change
  });
}

export function useSubscription(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscriptions.detail(id ?? ''),
    queryFn: () => subscriptionsApi.get(id!),
    enabled: !!id,
  });
}

export function useCancellationGuide(id: string) {
  return useQuery({
    queryKey: queryKeys.subscriptions.cancellationGuide(id),
    queryFn: () => subscriptionsApi.cancellationGuide(id),
    staleTime: ONE_HOUR,
  });
}

export function useCatalog(search: string) {
  return useQuery({
    queryKey: queryKeys.catalog(search),
    queryFn: () => catalogApi.list(search ? { search } : {}),
    staleTime: ONE_HOUR,
    placeholderData: previous => previous,
  });
}

export function useCatalogService(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.catalogService(id ?? ''),
    queryFn: () => catalogApi.get(id!),
    enabled: !!id,
    staleTime: ONE_HOUR,
  });
}

export function useNotificationDefaults() {
  return useQuery({ queryKey: queryKeys.notificationSettings, queryFn: meApi.getNotificationSettings });
}

export function useMyPlan() {
  return useQuery({ queryKey: queryKeys.plan, queryFn: meApi.getPlan, staleTime: 5 * 60 * 1000 });
}

export function useMeta() {
  return useQuery({ queryKey: queryKeys.meta, queryFn: metaApi.get, staleTime: 24 * ONE_HOUR });
}

/** Refreshes every screen that shows subscription-derived data. */
function useInvalidateSubscriptionData() {
  const queryClient = useQueryClient();
  return (detail?: SubscriptionDetail) => {
    if (detail) {
      queryClient.setQueryData(queryKeys.subscriptions.detail(detail.subscription.id), detail);
    }
    subscriptionDependentKeys.forEach(queryKey => queryClient.invalidateQueries({ queryKey }));
  };
}

export function useSaveSubscription(id?: string) {
  const invalidate = useInvalidateSubscriptionData();
  return useMutation({
    mutationFn: (body: SaveSubscriptionRequest) =>
      id ? subscriptionsApi.update(id, body) : subscriptionsApi.create(body),
    onSuccess: detail => invalidate(detail),
  });
}

export function useSubscriptionActions(id: string) {
  const invalidate = useInvalidateSubscriptionData();
  const queryClient = useQueryClient();

  const markCancelled = useMutation({
    mutationFn: () => subscriptionsApi.markCancelled(id),
    onSuccess: detail => invalidate(detail),
  });
  const reactivate = useMutation({
    mutationFn: () => subscriptionsApi.reactivate(id),
    onSuccess: detail => invalidate(detail),
  });
  const remove = useMutation({
    mutationFn: () => subscriptionsApi.remove(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.subscriptions.detail(id) });
      invalidate();
    },
  });

  return { markCancelled, reactivate, remove };
}
