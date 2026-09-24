import { screen } from '@testing-library/react-native';
import { dashboardApi } from '../../../api/endpoints';
import { ApiError, ErrorCodes } from '../../../api/errors';
import type { Dashboard } from '../../../api/types';
import { useAuthStore } from '../../../store/authStore';
import { renderScreen } from '../../../test/renderWithProviders';
import { DashboardScreen } from '../DashboardScreen';

jest.mock('../../../api/endpoints', () => ({
  dashboardApi: { get: jest.fn() },
  authApi: { refresh: jest.fn(), logout: jest.fn() },
}));

const getDashboard = dashboardApi.get as jest.Mock;

const renewal = (name: string, days: number, price: number) => ({
  subscriptionId: `${name}-id`,
  serviceName: name,
  serviceSlug: null,
  brandColor: '#E50914',
  planName: 'Standard',
  price,
  currency: 'USD',
  billingCycle: 'Monthly' as const,
  renewalDate: '2026-09-26',
  daysRemaining: days,
});

const dashboard = (overrides: Partial<Dashboard> = {}): Dashboard => ({
  nextRenewal: renewal('Netflix', 3, 15.99),
  upcomingRenewals: [renewal('Netflix', 3, 15.99), renewal('Spotify', 8, 11.99)],
  activeSubscriptions: 2,
  monthlySpend: [{ amount: 27.98, currency: 'USD' }],
  yearlySpend: [{ amount: 335.76, currency: 'USD' }],
  dueNext7Days: [{ amount: 15.99, currency: 'USD' }],
  recentNotifications: [],
  unreadNotifications: 2,
  plan: { planCode: 'FREE', planName: 'Free', tier: 'Free', activeSubscriptions: 2, maxSubscriptions: 5, limitReached: false },
  preferredCurrency: 'USD',
  today: '2026-09-23',
  ...overrides,
});

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { fullName: 'Asha Sharma' } as never });
  });

  const extraRoutes = ['SubscriptionDetail', 'CancellationAssistance', 'Notifications', 'Premium', 'ServicePicker'] as const;

  it('leads with the next renewal, its amount and countdown', async () => {
    getDashboard.mockResolvedValue(dashboard());
    await renderScreen('MainTabs', DashboardScreen, { extraRoutes: [...extraRoutes] });

    expect(await screen.findByText('NEXT RENEWAL')).toBeTruthy();
    expect(screen.getByText('$15.99 / month')).toBeTruthy();
    expect(screen.getAllByText('Renews in 3 days').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'How to cancel before it renews' })).toBeTruthy();
    expect(screen.getByText('$27.98')).toBeTruthy(); // monthly
    expect(screen.getByText('2 of 5 free subscriptions used')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Notifications, 2 unread' })).toBeTruthy();
  });

  it('invites the first subscription when there are none', async () => {
    getDashboard.mockResolvedValue(
      dashboard({ nextRenewal: null, upcomingRenewals: [], activeSubscriptions: 0, monthlySpend: [], yearlySpend: [] }),
    );
    await renderScreen('MainTabs', DashboardScreen, { extraRoutes: [...extraRoutes] });

    expect(await screen.findByText('No subscriptions yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add your first subscription' })).toBeTruthy();
  });

  it('shows an offline error with retry when nothing is cached', async () => {
    getDashboard.mockRejectedValue(new ApiError({ code: ErrorCodes.Network, message: "You're offline." }));
    await renderScreen('MainTabs', DashboardScreen, { extraRoutes: [...extraRoutes] });

    expect(await screen.findByText("You're offline")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
