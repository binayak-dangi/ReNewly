import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { calendarApi, meApi, notificationsApi, plansApi } from '../../api/endpoints';
import type { AppNotification, MyPlan, SubscriptionPlan } from '../../api/types';
import { renderScreen } from '../../test/renderWithProviders';
import { toIsoDate } from '../../utils/format';
import { CalendarScreen } from '../calendar/CalendarScreen';
import { NotificationsScreen } from '../notifications/NotificationsScreen';
import { PremiumScreen } from '../premium/PremiumScreen';

jest.mock('../../api/endpoints', () => ({
  calendarApi: { get: jest.fn() },
  notificationsApi: { list: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() },
  plansApi: { list: jest.fn() },
  meApi: { getPlan: jest.fn() },
  authApi: { refresh: jest.fn(), logout: jest.fn() },
}));

const mocked = {
  calendar: calendarApi.get as jest.Mock,
  notifications: notificationsApi as jest.Mocked<typeof notificationsApi>,
  plans: plansApi.list as jest.Mock,
  plan: meApi.getPlan as jest.Mock,
};

beforeEach(() => jest.clearAllMocks());

describe('CalendarScreen', () => {
  it('shows this month’s renewals and the month total', async () => {
    const today = toIsoDate(new Date());
    mocked.calendar.mockImplementation(async (from: string, to: string) => ({
      from,
      to,
      today,
      events: [
        {
          date: today,
          subscriptionId: 'sub-1',
          serviceName: 'Netflix',
          serviceSlug: 'netflix',
          brandColor: '#E50914',
          planName: 'Standard',
          price: 15.99,
          currency: 'USD',
          billingCycle: 'Monthly',
        },
      ],
      totals: [{ amount: 15.99, currency: 'USD' }],
    }));

    await renderScreen('MainTabs', CalendarScreen, { extraRoutes: ['SubscriptionDetail'] });

    expect(await screen.findByText('Netflix')).toBeTruthy();
    expect(screen.getAllByText('$15.99').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /1 renewal$/ })).toBeTruthy();
  });
});

describe('NotificationsScreen', () => {
  const notification = (overrides: Partial<AppNotification>): AppNotification => ({
    id: 'n1',
    type: 'RenewalReminder',
    channel: 'Push',
    title: 'Netflix renews in 3 days',
    body: 'Amount: $15.99\nRenewal date: September 26',
    status: 'Sent',
    isRead: false,
    subscriptionId: 'sub-1',
    createdAtUtc: '2026-09-23T09:00:00Z',
    sentAtUtc: '2026-09-23T09:00:01Z',
    ...overrides,
  });

  it('lists reminders, flags failures and marks as read on open', async () => {
    mocked.notifications.list.mockResolvedValue({
      items: [notification({}), notification({ id: 'n2', status: 'Failed', isRead: true, title: 'Spotify renews tomorrow' })],
      page: 1,
      pageSize: 20,
      totalCount: 2,
      hasMore: false,
    });
    mocked.notifications.markRead.mockResolvedValue(null);

    await renderScreen('Notifications', NotificationsScreen, { extraRoutes: ['SubscriptionDetail'] });

    expect(await screen.findByText('Netflix renews in 3 days')).toBeTruthy();
    expect(screen.getByText('Not delivered')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /^Unread\. Netflix renews in 3 days/ }));
    await waitFor(() => expect(mocked.notifications.markRead).toHaveBeenCalled());
    expect(mocked.notifications.markRead.mock.calls[0][0]).toBe('n1');
  });

  it('shows a friendly empty state', async () => {
    mocked.notifications.list.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0, hasMore: false });
    await renderScreen('Notifications', NotificationsScreen);

    expect(await screen.findByText('No notifications yet')).toBeTruthy();
  });
});

describe('PremiumScreen', () => {
  const plan = (code: string, tier: 'Free' | 'Pro', price: number, cycle: SubscriptionPlan['billingCycle']): SubscriptionPlan => ({
    id: code,
    code,
    name: code === 'FREE' ? 'Free' : cycle === 'Yearly' ? 'Pro Yearly' : 'Pro Monthly',
    description: null,
    tier,
    price,
    currency: 'USD',
    billingCycle: cycle,
    maxSubscriptions: tier === 'Free' ? 5 : null,
    maxRemindersPerSubscription: tier === 'Free' ? 1 : 3,
    emailRemindersEnabled: tier === 'Pro',
    advancedAnalyticsEnabled: tier === 'Pro',
    receiptStorageEnabled: tier === 'Pro',
    cloudSyncEnabled: tier === 'Pro',
    adsEnabled: tier === 'Free',
    googlePlayProductId: tier === 'Pro' ? `renewly_${code.toLowerCase()}` : null,
  });

  it('compares plans and keeps purchase disabled until billing is available', async () => {
    mocked.plans.mockResolvedValue([plan('FREE', 'Free', 0, null), plan('PRO_MONTHLY', 'Pro', 2.99, 'Monthly'), plan('PRO_YEARLY', 'Pro', 24.99, 'Yearly')]);
    mocked.plan.mockResolvedValue({
      activeSubscriptions: 2,
      remainingSubscriptions: 3,
      entitlements: { planCode: 'FREE', planName: 'Free', tier: 'Free', maxSubscriptions: 5, isPro: false } as MyPlan['entitlements'],
    });

    await renderScreen('Premium', PremiumScreen);

    expect(await screen.findByText('Never miss a renewal')).toBeTruthy();
    expect(screen.getByText('Up to 5')).toBeTruthy();
    expect(screen.getByText('Save 30%')).toBeTruthy(); // 24.99 vs 12 × 2.99
    const cta = await screen.findByRole('button', { name: 'Coming soon' });
    expect(cta.props.accessibilityState).toMatchObject({ disabled: true });
  });
});
