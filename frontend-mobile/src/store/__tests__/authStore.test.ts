import { authApi } from '../../api/endpoints';
import { ApiError, ErrorCodes } from '../../api/errors';
import type { AuthResponse, User } from '../../api/types';
import { secureSession } from '../../services/secureSession';
import { sessionEvents } from '../../services/sessionEvents';
import { useAuthStore } from '../authStore';

jest.mock('../../api/endpoints', () => ({
  authApi: { refresh: jest.fn(), logout: jest.fn(() => Promise.resolve(null)) },
}));

const refresh = authApi.refresh as jest.Mock;
const logout = authApi.logout as jest.Mock;

const user = (emailConfirmed = true): User => ({
  id: 'u1',
  email: 'asha@example.com',
  fullName: 'Asha',
  emailConfirmed,
  preferredCurrency: 'USD',
  timeZoneId: 'Asia/Kathmandu',
  language: 'en',
  createdAtUtc: '2026-09-01T00:00:00Z',
});

const session = (overrides: Partial<AuthResponse> = {}): AuthResponse => ({
  accessToken: 'access-1',
  accessTokenExpiresAtUtc: '2099-01-01T00:15:00Z',
  refreshToken: 'refresh-2',
  refreshTokenExpiresAtUtc: '2099-01-31T00:00:00Z',
  user: user(),
  ...overrides,
});

const initialState = useAuthStore.getState();

describe('auth store', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await secureSession.clear();
    useAuthStore.setState({ ...initialState, status: 'booting' }, true);
  });

  it('starts signed out when nothing is stored', async () => {
    await useAuthStore.getState().bootstrap();

    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('restores a stored session by refreshing it', async () => {
    await secureSession.save({ refreshToken: 'refresh-1', refreshTokenExpiresAtUtc: '2099-01-01T00:00:00Z', user: user() });
    refresh.mockResolvedValue(session());

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(refresh).toHaveBeenCalledWith('refresh-1');
    expect(state.status).toBe('signedIn');
    expect(state.accessToken).toBe('access-1');
    expect((await secureSession.load())?.refreshToken).toBe('refresh-2'); // rotated token persisted
  });

  it('routes unverified users to verification', async () => {
    await useAuthStore.getState().applySession(session({ user: user(false) }));

    expect(useAuthStore.getState().status).toBe('unverified');
  });

  it('signs out when the stored refresh token is rejected', async () => {
    await secureSession.save({ refreshToken: 'revoked', refreshTokenExpiresAtUtc: '2099-01-01T00:00:00Z', user: user() });
    refresh.mockRejectedValue(new ApiError({ code: ErrorCodes.InvalidToken, message: 'expired', status: 401 }));

    await useAuthStore.getState().bootstrap();

    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(useAuthStore.getState().lastSignOutReason).toBe('expired');
    expect(await secureSession.load()).toBeNull();
  });

  it('opens offline with the cached profile', async () => {
    await secureSession.save({ refreshToken: 'refresh-1', refreshTokenExpiresAtUtc: '2099-01-01T00:00:00Z', user: user() });
    refresh.mockRejectedValue(new ApiError({ code: ErrorCodes.Network, message: 'offline' }));

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.status).toBe('signedIn');
    expect(state.user?.email).toBe('asha@example.com');
    expect(state.accessToken).toBeNull();
    expect(await secureSession.load()).not.toBeNull();
  });

  it('shares one refresh between concurrent callers', async () => {
    await useAuthStore.getState().applySession(session());
    let resolve!: (value: AuthResponse) => void;
    refresh.mockReturnValue(new Promise<AuthResponse>(r => (resolve = r)));

    const first = useAuthStore.getState().refreshSession();
    const second = useAuthStore.getState().refreshSession();
    resolve(session({ accessToken: 'access-2', refreshToken: 'refresh-3' }));

    await expect(Promise.all([first, second])).resolves.toEqual(['access-2', 'access-2']);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('signs out: revokes server-side, clears storage and notifies listeners', async () => {
    const listener = jest.fn();
    const unsubscribe = sessionEvents.subscribe(listener);
    await useAuthStore.getState().applySession(session());

    await useAuthStore.getState().signOut('user');

    expect(logout).toHaveBeenCalledWith('refresh-2');
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', user: null, accessToken: null });
    expect(await secureSession.load()).toBeNull();
    expect(listener).toHaveBeenLastCalledWith('signedOut');
    unsubscribe();
  });

  it('does not call the server when the session already expired', async () => {
    await useAuthStore.getState().applySession(session());

    await useAuthStore.getState().signOut('expired');

    expect(logout).not.toHaveBeenCalled();
  });
});
