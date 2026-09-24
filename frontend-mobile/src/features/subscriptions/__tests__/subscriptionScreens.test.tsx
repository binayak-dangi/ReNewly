import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { catalogApi, meApi, metaApi, subscriptionsApi } from '../../../api/endpoints';
import type { CancellationGuide, MyPlan, Subscription, SubscriptionDetail } from '../../../api/types';
import { useAuthStore } from '../../../store/authStore';
import { renderScreen } from '../../../test/renderWithProviders';
import { CancellationAssistanceScreen } from '../screens/CancellationAssistanceScreen';
import { SubscriptionFormScreen } from '../screens/SubscriptionFormScreen';

jest.mock('../../../api/endpoints', () => ({
  subscriptionsApi: {
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    markCancelled: jest.fn(),
    reactivate: jest.fn(),
    remove: jest.fn(),
    cancellationGuide: jest.fn(),
  },
  catalogApi: { get: jest.fn(), list: jest.fn() },
  meApi: { getPlan: jest.fn(), getNotificationSettings: jest.fn() },
  metaApi: { get: jest.fn() },
  authApi: { refresh: jest.fn(), logout: jest.fn() },
}));

const api = {
  subs: subscriptionsApi as jest.Mocked<typeof subscriptionsApi>,
  catalog: catalogApi as jest.Mocked<typeof catalogApi>,
  me: meApi as jest.Mocked<typeof meApi>,
  meta: metaApi as jest.Mocked<typeof metaApi>,
};

const freePlan: MyPlan = {
  activeSubscriptions: 2,
  remainingSubscriptions: 3,
  entitlements: {
    planCode: 'FREE',
    planName: 'Free',
    tier: 'Free',
    maxSubscriptions: 5,
    maxRemindersPerSubscription: 1,
    emailReminders: false,
    advancedAnalytics: false,
    receiptStorage: false,
    cloudSync: false,
    ads: true,
    expiresAtUtc: null,
    isPro: false,
  },
};

const subscription: Subscription = {
  id: 'sub-1',
  serviceId: 'svc-netflix',
  serviceSlug: 'netflix',
  serviceName: 'Netflix',
  planName: 'Standard',
  category: 'Entertainment',
  brandColor: '#E50914',
  price: 15.99,
  currency: 'USD',
  billingCycle: 'Monthly',
  nextRenewalDate: '2026-09-26',
  daysUntilRenewal: 3,
  monthlyCost: 15.99,
  yearlyCost: 191.88,
  paymentMethodLabel: 'Visa ****4521',
  notes: null,
  status: 'Active',
  cancelledAtUtc: null,
  reminderDaysBefore: [3],
  pushReminderEnabled: true,
  emailReminderEnabled: false,
  hasOfficialCancellationPage: true,
  createdAtUtc: '2026-09-01T00:00:00Z',
  updatedAtUtc: null,
};
const detail: SubscriptionDetail = { subscription, reminderSchedule: [] };

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    status: 'signedIn',
    user: {
      id: 'u1',
      email: 'asha@example.com',
      fullName: 'Asha Sharma',
      emailConfirmed: true,
      preferredCurrency: 'USD',
      timeZoneId: 'UTC',
      language: 'en',
      createdAtUtc: '2026-09-01T00:00:00Z',
    },
  });
  api.me.getPlan.mockResolvedValue(freePlan);
  api.me.getNotificationSettings.mockResolvedValue({
    pushEnabled: true,
    emailEnabled: true,
    defaultReminderDaysBefore: [3],
    reminderTimeOfDay: '09:00:00',
    productUpdatesEmailEnabled: false,
  });
  api.meta.get.mockResolvedValue({
    currencies: ['EUR', 'NPR', 'USD'],
    languages: ['en'],
    reminderDaysBefore: [7, 3, 1],
    categories: [{ value: 'Other', label: 'Other' }],
    billingCycles: [],
  });
});

async function pickDate(year: number, monthIndex: number, day: number) {
  // Jest runs as iOS: the date field toggles an inline picker (mocked as a View with onChange).
  await fireEvent.press(screen.getByRole('button', { name: /Next renewal date/ }));
  const picker = screen.getByTestId('date-picker');
  await fireEvent(picker, 'onChange', {}, new Date(year, monthIndex, day));
}

describe('SubscriptionFormScreen', () => {
  const routes = ['SubscriptionDetail', 'Premium', 'MainTabs'] as const;

  it('adds a custom subscription with the entered values', async () => {
    api.subs.create.mockResolvedValue({ ...detail, subscription: { ...subscription, serviceId: null, serviceName: 'City Gym' } });
    await renderScreen('SubscriptionForm', SubscriptionFormScreen, { params: {}, extraRoutes: [...routes] });

    await fireEvent.changeText(screen.getByLabelText('Service'), 'City Gym');
    await fireEvent.changeText(screen.getByLabelText('Amount'), '40');
    await pickDate(2026, 9, 5);
    await fireEvent.press(screen.getByRole('button', { name: 'Add subscription' }));

    await waitFor(() => expect(api.subs.create).toHaveBeenCalled());
    expect(api.subs.create).toHaveBeenCalledWith({
      serviceId: null,
      serviceName: 'City Gym',
      planName: null,
      category: 'Other',
      price: 40,
      currency: 'USD',
      billingCycle: 'Monthly',
      nextRenewalDate: '2026-10-05',
      reminderDaysBefore: [3],
      pushReminderEnabled: true,
      emailReminderEnabled: false,
      paymentMethodLabel: null,
      notes: null,
    });
  });

  it('refuses a full card number in the payment label', async () => {
    await renderScreen('SubscriptionForm', SubscriptionFormScreen, { params: {}, extraRoutes: [...routes] });

    await fireEvent.changeText(screen.getByLabelText('Service'), 'City Gym');
    await fireEvent.changeText(screen.getByLabelText('Amount'), '40');
    await pickDate(2026, 9, 5);
    await fireEvent.changeText(screen.getByLabelText('Payment method (optional)'), '4111 1111 1111 1111');
    await fireEvent.press(screen.getByRole('button', { name: 'Add subscription' }));

    expect(await screen.findByText(/enter only a label and the last 4 digits/)).toBeTruthy();
    expect(api.subs.create).not.toHaveBeenCalled();
  });

  it('on the Free plan, a second reminder day replaces the first and email offers Pro', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderScreen('SubscriptionForm', SubscriptionFormScreen, { params: {}, extraRoutes: [...routes] });
    await screen.findByText(/Free plan: 1 reminder/);

    await fireEvent.press(screen.getByRole('button', { name: '7 days before' }));
    expect(screen.getByRole('button', { name: '7 days before' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: '3 days before' }).props.accessibilityState.selected).toBe(false);

    await fireEvent.press(screen.getByRole('switch', { name: 'Email, Pro feature' }));
    expect(alert).toHaveBeenCalledWith('Renewly Pro', expect.stringContaining('Email reminders'), expect.any(Array));
  });

  it('edits an existing subscription', async () => {
    api.subs.get.mockResolvedValue(detail);
    api.subs.update.mockResolvedValue(detail);
    await renderScreen('SubscriptionForm', SubscriptionFormScreen, { params: { id: 'sub-1' }, extraRoutes: [...routes] });

    expect(await screen.findByText('Netflix')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Amount'), '17.99');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(api.subs.update).toHaveBeenCalledWith('sub-1', expect.objectContaining({ price: 17.99, serviceId: 'svc-netflix' })),
    );
  });
});

describe('CancellationAssistanceScreen', () => {
  const guide: CancellationGuide = {
    serviceId: 'svc-netflix',
    serviceName: 'Netflix',
    cancellationUrl: 'https://www.netflix.com/cancelplan',
    steps: ['Sign in to Netflix in a web browser.', "Select 'Cancel membership'."],
    disclaimer: 'Renewly does not control your subscription with this provider.',
    storeBillingNote: 'If you subscribed through Google Play, cancel it from that store instead.',
    googlePlaySubscriptionsUrl: 'https://play.google.com/store/account/subscriptions',
  };

  beforeEach(() => {
    api.subs.get.mockResolvedValue(detail);
    api.subs.cancellationGuide.mockResolvedValue(guide);
  });

  it('is honest about what Renewly can do and links to the official page', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderScreen('CancellationAssistance', CancellationAssistanceScreen, { params: { id: 'sub-1' }, extraRoutes: ['MainTabs'] });

    expect(await screen.findByText(guide.disclaimer)).toBeTruthy();
    expect(screen.getByText('Sign in to Netflix in a web browser.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open official cancellation page' }));

    expect(openURL).toHaveBeenCalledWith('https://www.netflix.com/cancelplan');
  });

  it('marks as cancelled only after confirmation', async () => {
    api.subs.markCancelled.mockResolvedValue({ ...detail, subscription: { ...subscription, status: 'Cancelled' } });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderScreen('CancellationAssistance', CancellationAssistanceScreen, { params: { id: 'sub-1' }, extraRoutes: ['MainTabs'] });

    await fireEvent.press(await screen.findByRole('button', { name: "I've cancelled – mark as cancelled" }));
    expect(api.subs.markCancelled).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2]!;
    await buttons.find(b => b.text === 'Yes, mark as cancelled')!.onPress!();

    await waitFor(() => expect(api.subs.markCancelled).toHaveBeenCalledWith('sub-1'));
  });
});
