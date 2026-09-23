import { api } from './client';
import type {
  AppMetadata,
  AppNotification,
  AuthResponse,
  CalendarRange,
  CancellationGuide,
  CatalogService,
  ChangePasswordRequest,
  Dashboard,
  Insights,
  IsoDate,
  LoginRequest,
  MyPlan,
  NotificationListQuery,
  NotificationSettings,
  PagedResult,
  RegisterDeviceRequest,
  RegisterRequest,
  ResetPasswordRequest,
  SaveSubscriptionRequest,
  Subscription,
  SubscriptionCategory,
  SubscriptionDetail,
  SubscriptionListQuery,
  SubscriptionPlan,
  UpdateProfileRequest,
  User,
} from './types';

const publicCall = { skipAuth: true } as const;

export const authApi = {
  register: (body: RegisterRequest) => api.post<AuthResponse>('/auth/register', body, publicCall),
  login: (body: LoginRequest) => api.post<AuthResponse>('/auth/login', body, publicCall),
  refresh: (refreshToken: string) => api.post<AuthResponse>('/auth/refresh', { refreshToken }, publicCall),
  logout: (refreshToken: string) => api.post<null>('/auth/logout', { refreshToken }, publicCall),
  verifyEmail: (code: string) => api.post<AuthResponse>('/auth/verify-email', { code }),
  resendVerification: () => api.postWithMessage<null>('/auth/resend-verification'),
  forgotPassword: (email: string) => api.postWithMessage<null>('/auth/forgot-password', { email }, publicCall),
  resetPassword: (body: ResetPasswordRequest) => api.postWithMessage<null>('/auth/reset-password', body, publicCall),
  changePassword: (body: ChangePasswordRequest) => api.post<AuthResponse>('/auth/change-password', body),
};

export const meApi = {
  get: () => api.get<User>('/me'),
  updateProfile: (body: UpdateProfileRequest) => api.put<User>('/me/profile', body),
  getNotificationSettings: () => api.get<NotificationSettings>('/me/notification-settings'),
  updateNotificationSettings: (body: NotificationSettings) =>
    api.put<NotificationSettings>('/me/notification-settings', body),
  getPlan: () => api.get<MyPlan>('/me/plan'),
  deleteAccount: (password: string) => api.post<null>('/me/delete', { password }),
};

export const subscriptionsApi = {
  list: (query: SubscriptionListQuery = {}) => api.get<Subscription[]>('/subscriptions', query),
  get: (id: string) => api.get<SubscriptionDetail>(`/subscriptions/${id}`),
  create: (body: SaveSubscriptionRequest) => api.post<SubscriptionDetail>('/subscriptions', body),
  update: (id: string, body: SaveSubscriptionRequest) => api.put<SubscriptionDetail>(`/subscriptions/${id}`, body),
  remove: (id: string) => api.delete<null>(`/subscriptions/${id}`),
  markCancelled: (id: string) => api.post<SubscriptionDetail>(`/subscriptions/${id}/mark-cancelled`),
  reactivate: (id: string) => api.post<SubscriptionDetail>(`/subscriptions/${id}/reactivate`),
  cancellationGuide: (id: string) => api.get<CancellationGuide>(`/subscriptions/${id}/cancellation-guide`),
};

export const dashboardApi = {
  get: () => api.get<Dashboard>('/dashboard'),
};

export const calendarApi = {
  get: (from: IsoDate, to: IsoDate) => api.get<CalendarRange>('/calendar', { from, to }),
};

export const insightsApi = {
  get: () => api.get<Insights>('/insights'),
};

export const notificationsApi = {
  list: (query: NotificationListQuery = {}) => api.get<PagedResult<AppNotification>>('/notifications', query),
  unreadCount: () => api.get<{ unread: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.post<null>(`/notifications/${id}/read`),
  markAllRead: () => api.post<null>('/notifications/read-all'),
};

export const devicesApi = {
  register: (body: RegisterDeviceRequest) => api.post<null>('/devices', body),
  unregister: (fcmToken: string) => api.post<null>('/devices/unregister', { fcmToken }),
};

export const catalogApi = {
  list: (params: { search?: string; category?: SubscriptionCategory } = {}) =>
    api.get<CatalogService[]>('/services', params, publicCall),
  cancellationGuide: (serviceId: string) =>
    api.get<CancellationGuide>(`/services/${serviceId}/cancellation-guide`, undefined, publicCall),
};

export const plansApi = {
  list: () => api.get<SubscriptionPlan[]>('/plans', undefined, publicCall),
};

export const metaApi = {
  get: () => api.get<AppMetadata>('/meta', undefined, publicCall),
};
