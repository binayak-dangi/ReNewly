import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meApi } from '../../api/endpoints';
import { queryKeys, subscriptionDependentKeys } from '../../api/queryKeys';
import type { NotificationSettings, UpdateProfileRequest, User } from '../../api/types';
import { useAuthStore } from '../../store/authStore';

/** Full profile payload from the current user with some fields changed. */
export function profilePayload(user: User, changes: Partial<UpdateProfileRequest>): UpdateProfileRequest {
  return {
    fullName: user.fullName,
    preferredCurrency: user.preferredCurrency,
    timeZoneId: user.timeZoneId,
    language: user.language,
    ...changes,
  };
}

export function useUpdateProfile() {
  const updateUser = useAuthStore(s => s.updateUser);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: meApi.updateProfile,
    onSuccess: async user => {
      await updateUser(user);
      queryClient.setQueryData(queryKeys.me, user);
      // Currency and time zone change totals, "today" and reminder times everywhere.
      subscriptionDependentKeys.forEach(queryKey => queryClient.invalidateQueries({ queryKey }));
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: NotificationSettings) => meApi.updateNotificationSettings(settings),
    onSuccess: settings => {
      queryClient.setQueryData(queryKeys.notificationSettings, settings);
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all }); // reminder schedules changed
    },
  });
}
