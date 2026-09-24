import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { authApi } from '../../../api/endpoints';
import { ApiError, ErrorCodes } from '../../../api/errors';
import type { AuthResponse } from '../../../api/types';
import { useAuthStore } from '../../../store/authStore';
import { renderScreen } from '../../../test/renderWithProviders';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { VerifyEmailScreen } from '../screens/VerifyEmailScreen';

jest.mock('../../../api/endpoints', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(() => Promise.resolve(null)),
  },
}));

const mocked = authApi as jest.Mocked<typeof authApi>;

const session = (emailConfirmed: boolean): AuthResponse => ({
  accessToken: 'a',
  accessTokenExpiresAtUtc: '2099-01-01T00:00:00Z',
  refreshToken: 'r',
  refreshTokenExpiresAtUtc: '2099-02-01T00:00:00Z',
  user: {
    id: 'u1',
    email: 'asha@example.com',
    fullName: 'Asha Sharma',
    emailConfirmed,
    preferredCurrency: 'USD',
    timeZoneId: 'UTC',
    language: 'en',
    createdAtUtc: '2026-09-01T00:00:00Z',
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ status: 'signedOut', user: null, accessToken: null, refreshToken: null, lastSignOutReason: null });
});

describe('LoginScreen', () => {
  it('validates before calling the API', async () => {
    await renderScreen('Login', LoginScreen, { extraRoutes: ['Register', 'ForgotPassword'] });

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Password is required.')).toBeTruthy();
    expect(mocked.login).not.toHaveBeenCalled();
  });

  it('signs in and stores the session', async () => {
    mocked.login.mockResolvedValue(session(true));
    await renderScreen('Login', LoginScreen, { extraRoutes: ['Register', 'ForgotPassword'] });

    await fireEvent.changeText(screen.getByLabelText('Email'), ' asha@example.com ');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Passw0rd!');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedIn'));
    expect(mocked.login).toHaveBeenCalledWith(expect.objectContaining({ email: 'asha@example.com', password: 'Passw0rd!' }));
  });

  it('shows wrong-password errors above the form', async () => {
    mocked.login.mockRejectedValue(
      new ApiError({ code: ErrorCodes.InvalidCredentials, message: 'Incorrect email or password.', status: 401 }),
    );
    await renderScreen('Login', LoginScreen, { extraRoutes: ['Register', 'ForgotPassword'] });

    await fireEvent.changeText(screen.getByLabelText('Email'), 'asha@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong-pass1');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('explains an expired session', async () => {
    useAuthStore.setState({ lastSignOutReason: 'expired' });
    await renderScreen('Login', LoginScreen, { extraRoutes: ['Register', 'ForgotPassword'] });

    expect(screen.getByText('Your session has expired. Please sign in again.')).toBeTruthy();
  });
});

describe('RegisterScreen', () => {
  it('enforces the password rules', async () => {
    await renderScreen('Register', RegisterScreen, { extraRoutes: ['Login'] });

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Asha');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'asha@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'onlyletters');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must contain at least one letter and one number.')).toBeTruthy();
    expect(mocked.register).not.toHaveBeenCalled();
  });

  it('flags an email that is already registered', async () => {
    mocked.register.mockRejectedValue(
      new ApiError({ code: ErrorCodes.EmailAlreadyRegistered, message: 'exists', status: 409 }),
    );
    await renderScreen('Register', RegisterScreen, { extraRoutes: ['Login'] });

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Asha');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'asha@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Passw0rd!');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('An account with this email already exists. Sign in instead.')).toBeTruthy();
  });

  it('creates the account and moves to verification', async () => {
    mocked.register.mockResolvedValue(session(false));
    await renderScreen('Register', RegisterScreen, { extraRoutes: ['Login'] });

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Asha Sharma');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'asha@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Passw0rd!');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(useAuthStore.getState().status).toBe('unverified'));
  });
});

describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'unverified', user: session(false).user, refreshToken: 'r', accessToken: 'a' });
  });

  it('verifies automatically once six digits are entered', async () => {
    mocked.verifyEmail.mockResolvedValue(session(true));
    await renderScreen('VerifyEmail', VerifyEmailScreen);

    expect(screen.getByText('asha@example.com')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('6-digit code'), '123456');

    await waitFor(() => expect(useAuthStore.getState().status).toBe('signedIn'));
    expect(mocked.verifyEmail).toHaveBeenCalledWith('123456');
  });

  it('clears the code and explains a wrong code', async () => {
    mocked.verifyEmail.mockRejectedValue(
      new ApiError({ code: ErrorCodes.InvalidToken, message: 'This code is invalid or has expired.', status: 422 }),
    );
    await renderScreen('VerifyEmail', VerifyEmailScreen);

    await fireEvent.changeText(screen.getByLabelText('6-digit code'), '000000');

    expect(await screen.findByText('This code is invalid or has expired.')).toBeTruthy();
    expect(screen.getByLabelText('6-digit code').props.value).toBe('');
    expect(useAuthStore.getState().status).toBe('unverified');
  });

  it('disables resend during the cooldown', async () => {
    await renderScreen('VerifyEmail', VerifyEmailScreen);

    const resend = screen.getByRole('button', { name: /Resend code in \d+s/ });
    expect(resend.props.accessibilityState).toMatchObject({ disabled: true });
  });
});
