/**
 * Types mirroring the Renewly API (backend/Renewly.Application DTOs).
 * Enums are serialised by name; dates are ISO strings ("2026-09-25" for DateOnly, UTC for DateTime).
 */

// ---------- Envelope ----------

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, string[]> | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  error: ApiErrorBody | null;
  traceId: string | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

/** yyyy-MM-dd */
export type IsoDate = string;
/** ISO-8601 UTC timestamp */
export type IsoDateTime = string;

export interface Money {
  amount: number;
  currency: string;
}

// ---------- Enums ----------

export type BillingCycle = 'Weekly' | 'Monthly' | 'Quarterly' | 'SemiAnnually' | 'Yearly';

export type SubscriptionCategory =
  | 'Other'
  | 'Entertainment'
  | 'Music'
  | 'Productivity'
  | 'AiTools'
  | 'Shopping'
  | 'CloudStorage'
  | 'Education'
  | 'News'
  | 'Fitness'
  | 'Gaming'
  | 'Utilities'
  | 'Design'
  | 'Finance';

export type SubscriptionStatus = 'Active' | 'Cancelled' | 'Paused';
export type NotificationChannel = 'Push' | 'Email';
export type NotificationType = 'RenewalReminder' | 'Account' | 'System' | 'Billing';
export type NotificationStatus = 'Pending' | 'Sent' | 'Failed';
export type ReminderStatus = 'Scheduled' | 'Processing' | 'Sent' | 'Failed' | 'Skipped' | 'Cancelled';
export type PlanTier = 'Free' | 'Pro';
export type DevicePlatform = 'Android' | 'Ios';

// ---------- Auth & account ----------

export interface User {
  id: string;
  email: string;
  fullName: string;
  emailConfirmed: boolean;
  preferredCurrency: string;
  timeZoneId: string;
  language: string;
  createdAtUtc: IsoDateTime;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAtUtc: IsoDateTime;
  refreshToken: string;
  refreshTokenExpiresAtUtc: IsoDateTime;
  user: User;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  timeZoneId?: string | null;
  preferredCurrency?: string | null;
  deviceName?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceName?: string | null;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  preferredCurrency: string;
  timeZoneId: string;
  language: string;
}

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  defaultReminderDaysBefore: number[];
  /** "HH:mm:ss" local time */
  reminderTimeOfDay: string;
  productUpdatesEmailEnabled: boolean;
}

export interface Entitlements {
  planCode: string;
  planName: string;
  tier: PlanTier;
  maxSubscriptions: number | null;
  maxRemindersPerSubscription: number;
  emailReminders: boolean;
  advancedAnalytics: boolean;
  receiptStorage: boolean;
  cloudSync: boolean;
  ads: boolean;
  expiresAtUtc: IsoDateTime | null;
  isPro: boolean;
}

export interface MyPlan {
  entitlements: Entitlements;
  activeSubscriptions: number;
  remainingSubscriptions: number | null;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tier: PlanTier;
  price: number;
  currency: string;
  billingCycle: BillingCycle | null;
  maxSubscriptions: number | null;
  maxRemindersPerSubscription: number;
  emailRemindersEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  receiptStorageEnabled: boolean;
  cloudSyncEnabled: boolean;
  adsEnabled: boolean;
  googlePlayProductId: string | null;
}

// ---------- Catalog ----------

export interface CatalogService {
  id: string;
  name: string;
  slug: string;
  category: SubscriptionCategory;
  websiteUrl: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  suggestedPlans: string[];
}

export interface CancellationGuide {
  serviceId: string | null;
  serviceName: string;
  cancellationUrl: string | null;
  steps: string[];
  disclaimer: string;
  storeBillingNote: string;
  googlePlaySubscriptionsUrl: string;
}

// ---------- Subscriptions ----------

export interface Subscription {
  id: string;
  serviceId: string | null;
  serviceSlug: string | null;
  serviceName: string;
  planName: string | null;
  category: SubscriptionCategory;
  brandColor: string | null;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  nextRenewalDate: IsoDate;
  daysUntilRenewal: number;
  monthlyCost: number;
  yearlyCost: number;
  paymentMethodLabel: string | null;
  notes: string | null;
  status: SubscriptionStatus;
  cancelledAtUtc: IsoDateTime | null;
  reminderDaysBefore: number[];
  pushReminderEnabled: boolean;
  emailReminderEnabled: boolean;
  hasOfficialCancellationPage: boolean;
  createdAtUtc: IsoDateTime;
  updatedAtUtc: IsoDateTime | null;
}

export interface Reminder {
  id: string;
  renewalDate: IsoDate;
  daysBefore: number;
  channel: NotificationChannel;
  scheduledForUtc: IsoDateTime;
  status: ReminderStatus;
}

export interface SubscriptionDetail {
  subscription: Subscription;
  reminderSchedule: Reminder[];
}

export interface SaveSubscriptionRequest {
  serviceId?: string | null;
  serviceName?: string | null;
  planName?: string | null;
  category?: SubscriptionCategory | null;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  nextRenewalDate: IsoDate;
  paymentMethodLabel?: string | null;
  notes?: string | null;
  reminderDaysBefore?: number[] | null;
  pushReminderEnabled: boolean;
  emailReminderEnabled: boolean;
}

export type SubscriptionStatusFilter = 'Active' | 'Cancelled' | 'All';
export type SubscriptionSort = 'RenewalDate' | 'PriceHighToLow' | 'Name';

export interface SubscriptionListQuery {
  status?: SubscriptionStatusFilter;
  search?: string;
  sort?: SubscriptionSort;
}

// ---------- Dashboard / calendar / insights ----------

export interface UpcomingRenewal {
  subscriptionId: string;
  serviceName: string;
  serviceSlug: string | null;
  brandColor: string | null;
  planName: string | null;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  renewalDate: IsoDate;
  daysRemaining: number;
}

export interface PlanUsage {
  planCode: string;
  planName: string;
  tier: PlanTier;
  activeSubscriptions: number;
  maxSubscriptions: number | null;
  limitReached: boolean;
}

export interface Dashboard {
  nextRenewal: UpcomingRenewal | null;
  upcomingRenewals: UpcomingRenewal[];
  activeSubscriptions: number;
  monthlySpend: Money[];
  yearlySpend: Money[];
  dueNext7Days: Money[];
  recentNotifications: AppNotification[];
  unreadNotifications: number;
  plan: PlanUsage;
  preferredCurrency: string;
  today: IsoDate;
}

export interface CalendarEvent {
  date: IsoDate;
  subscriptionId: string;
  serviceName: string;
  serviceSlug: string | null;
  brandColor: string | null;
  planName: string | null;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
}

export interface CalendarRange {
  from: IsoDate;
  to: IsoDate;
  today: IsoDate;
  events: CalendarEvent[];
  totals: Money[];
}

export interface CategorySpend {
  category: SubscriptionCategory;
  currency: string;
  monthlyAmount: number;
  subscriptionCount: number;
  sharePercent: number;
}

export interface Insights {
  activeSubscriptions: number;
  monthlySpend: Money[];
  yearlySpend: Money[];
  upcomingRenewalCount30Days: number;
  upcomingRenewalAmount30Days: Money[];
  spendingByCategory: CategorySpend[];
  advancedAnalyticsAvailable: boolean;
  advanced: {
    twelveMonthForecast: { year: number; month: number; renewalCount: number; totals: Money[] }[];
    topSubscriptions: {
      subscriptionId: string;
      serviceName: string;
      brandColor: string | null;
      monthlyCost: number;
      currency: string;
      sharePercent: number;
    }[];
    billingCycleMix: { billingCycle: BillingCycle; subscriptionCount: number }[];
  } | null;
  preferredCurrency: string;
}

// ---------- Notifications / devices / meta ----------

export interface AppNotification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  status: NotificationStatus;
  isRead: boolean;
  subscriptionId: string | null;
  createdAtUtc: IsoDateTime;
  sentAtUtc: IsoDateTime | null;
}

export interface NotificationListQuery {
  page?: number;
  pageSize?: number;
  status?: NotificationStatus;
  unreadOnly?: boolean;
  channel?: NotificationChannel;
}

export interface RegisterDeviceRequest {
  fcmToken: string;
  platform: DevicePlatform;
  deviceName?: string | null;
  appVersion?: string | null;
}

export interface Option {
  value: string;
  label: string;
}

export interface AppMetadata {
  currencies: string[];
  languages: string[];
  reminderDaysBefore: number[];
  categories: Option[];
  billingCycles: Option[];
}
