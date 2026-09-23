import MockAdapter from 'axios-mock-adapter';
import { api, AuthBridge, configureAuthBridge, http } from '../client';
import { ApiError, ErrorCodes } from '../errors';

const envelope = <T>(data: T, message: string | null = null) => ({ success: true, data, message, error: null, traceId: 't' });
const failure = (code: string, message: string, details?: Record<string, string[]>) => ({
  success: false,
  data: null,
  message: null,
  error: { code, message, details: details ?? null },
  traceId: 'trace-1',
});

describe('api client', () => {
  let mock: MockAdapter;
  let accessToken: string | null;
  let bridge: jest.Mocked<AuthBridge>;

  beforeEach(() => {
    mock = new MockAdapter(http);
    accessToken = 'old-token';
    bridge = {
      getAccessToken: jest.fn(() => accessToken),
      refreshSession: jest.fn(async () => {
        accessToken = 'new-token';
        return accessToken;
      }),
      onSessionExpired: jest.fn(),
    };
    configureAuthBridge(bridge);
  });

  afterEach(() => {
    mock.restore();
    configureAuthBridge(null);
  });

  it('unwraps the envelope and sends the bearer token', async () => {
    mock.onGet('/dashboard').reply(config => {
      expect(config.headers?.Authorization).toBe('Bearer old-token');
      return [200, envelope({ activeSubscriptions: 3 })];
    });

    await expect(api.get('/dashboard')).resolves.toEqual({ activeSubscriptions: 3 });
  });

  it('does not send a token on public calls', async () => {
    mock.onGet('/plans').reply(config => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, envelope([])];
    });

    await api.get('/plans', undefined, { skipAuth: true });
  });

  it('retries every concurrent 401 with the refreshed token (single-flight is covered in authStore tests)', async () => {
    mock.onGet('/dashboard').reply(config =>
      config.headers?.Authorization === 'Bearer new-token' ? [200, envelope('dashboard')] : [401, failure('TOKEN_EXPIRED', 'expired')],
    );
    mock.onGet('/insights').reply(config =>
      config.headers?.Authorization === 'Bearer new-token' ? [200, envelope('insights')] : [401, failure('TOKEN_EXPIRED', 'expired')],
    );

    // Single-flight lives in the auth store; emulate it here so both 401s share one promise.
    let inflight: Promise<string | null> | null = null;
    const refreshSpy = jest.fn(bridge.refreshSession.getMockImplementation()!);
    bridge.refreshSession.mockImplementation(() => (inflight ??= refreshSpy()));

    const [a, b] = await Promise.all([api.get('/dashboard'), api.get('/insights')]);

    expect(a).toBe('dashboard');
    expect(b).toBe('insights');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(bridge.onSessionExpired).not.toHaveBeenCalled();
  });

  it('signs out when the session cannot be refreshed', async () => {
    bridge.refreshSession.mockResolvedValue(null);
    mock.onGet('/me').reply(401, failure('UNAUTHORIZED', 'Authentication is required.'));

    await expect(api.get('/me')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(bridge.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('never tries to refresh for auth endpoints', async () => {
    mock.onPost('/auth/login').reply(401, failure(ErrorCodes.InvalidCredentials, 'Incorrect email or password.'));

    await expect(api.post('/auth/login', {}, { skipAuth: true })).rejects.toMatchObject({
      code: ErrorCodes.InvalidCredentials,
      message: 'Incorrect email or password.',
    });
    expect(bridge.refreshSession).not.toHaveBeenCalled();
  });

  it('exposes field validation errors', async () => {
    mock.onPost('/subscriptions').reply(400, failure(ErrorCodes.ValidationFailed, 'Invalid', { price: ['Price cannot be negative.'] }));

    const error = (await api.post('/subscriptions', {}).catch(e => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.fieldError('price')).toBe('Price cannot be negative.');
    expect(error.isClientError).toBe(true);
    expect(error.traceId).toBe('trace-1');
  });

  it('maps network failures to NETWORK_ERROR without signing out', async () => {
    mock.onGet('/dashboard').networkError();

    const error = (await api.get('/dashboard').catch(e => e)) as ApiError;

    expect(error.code).toBe(ErrorCodes.Network);
    expect(error.isNetworkError).toBe(true);
    expect(bridge.onSessionExpired).not.toHaveBeenCalled();
  });

  it('keeps the session when refreshing fails because the device is offline', async () => {
    bridge.refreshSession.mockRejectedValue(new ApiError({ code: ErrorCodes.Network, message: 'offline' }));
    mock.onGet('/dashboard').reply(401, failure('TOKEN_EXPIRED', 'expired'));

    await expect(api.get('/dashboard')).rejects.toMatchObject({ code: ErrorCodes.Network });
    expect(bridge.onSessionExpired).not.toHaveBeenCalled();
  });

  it('returns the server message when asked', async () => {
    mock.onPost('/auth/forgot-password').reply(200, envelope(null, 'If an account exists, a code has been sent.'));

    await expect(api.postWithMessage('/auth/forgot-password', { email: 'a@b.c' })).resolves.toEqual({
      data: null,
      message: 'If an account exists, a code has been sent.',
    });
  });
});
