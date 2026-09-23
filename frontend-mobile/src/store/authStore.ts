import { create } from 'zustand';
import { configureAuthBridge } from '../api/client';
import { authApi } from '../api/endpoints';
import { toApiError } from '../api/errors';
import type { AuthResponse, User } from '../api/types';
import { secureSession, StoredSession } from '../services/secureSession';
import { sessionEvents } from '../services/sessionEvents';

/**
 * - booting:    reading the stored session on launch (splash screen)
 * - signedOut:  no session – show onboarding / sign in
 * - unverified: signed in but email not verified – show the verification screen
 * - signedIn:   full access
 */
export type AuthStatus = 'booting' | 'signedOut' | 'unverified' | 'signedIn';

export type SignOutReason = 'user' | 'expired' | 'accountDeleted';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** In memory only. */
  accessToken: string | null;
  refreshToken: string | null;
  /** Why the last sign-out happened, so the sign-in screen can explain an expired session. */
  lastSignOutReason: SignOutReason | null;

  bootstrap(): Promise<void>;
  /** Stores a session returned by register / login / refresh / verify-email / change-password. */
  applySession(auth: AuthResponse): Promise<void>;
  updateUser(user: User): Promise<void>;
  refreshSession(): Promise<string | null>;
  signOut(reason?: SignOutReason): Promise<void>;
}

const statusFor = (user: User): AuthStatus => (user.emailConfirmed ? 'signedIn' : 'unverified');

let inflightRefresh: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'booting',
  user: null,
  accessToken: null,
  refreshToken: null,
  lastSignOutReason: null,

  async bootstrap() {
    const stored = await secureSession.load();
    if (!stored || new Date(stored.refreshTokenExpiresAtUtc).getTime() <= Date.now()) {
      await secureSession.clear();
      set({ status: 'signedOut' });
      return;
    }

    set({ refreshToken: stored.refreshToken, user: stored.user });

    try {
      const token = await get().refreshSession();
      if (!token) {
        await get().signOut('expired');
      }
    } catch (error) {
      if (toApiError(error).isNetworkError) {
        // Offline launch: open with the cached profile and cached data. The first request made
        // once online will refresh the access token through the HTTP client.
        set({ status: statusFor(stored.user) });
        return;
      }
      await get().signOut('expired');
    }
  },

  async applySession(auth) {
    const session: StoredSession = {
      refreshToken: auth.refreshToken,
      refreshTokenExpiresAtUtc: auth.refreshTokenExpiresAtUtc,
      user: auth.user,
    };
    await secureSession.save(session);

    const wasSignedOut = get().status === 'signedOut' || get().status === 'booting';
    set({
      status: statusFor(auth.user),
      user: auth.user,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      lastSignOutReason: null,
    });

    if (wasSignedOut) {
      sessionEvents.emit('signedIn');
    }
  },

  async updateUser(user) {
    const { refreshToken, status } = get();
    set({ user, status: status === 'signedOut' || status === 'booting' ? status : statusFor(user) });

    const stored = await secureSession.load();
    if (stored && refreshToken) {
      await secureSession.save({ ...stored, user });
    }
  },

  refreshSession() {
    // Single-flight: concurrent 401s share one refresh (refresh tokens are single-use).
    if (inflightRefresh) {
      return inflightRefresh;
    }

    const refreshToken = get().refreshToken;
    if (!refreshToken) {
      return Promise.resolve(null);
    }

    inflightRefresh = (async () => {
      try {
        const auth = await authApi.refresh(refreshToken);
        await get().applySession(auth);
        return auth.accessToken;
      } catch (error) {
        const apiError = toApiError(error);
        if (apiError.status === 401) {
          return null; // Refresh token revoked or expired.
        }
        throw apiError; // Network/server problem: keep the session.
      } finally {
        inflightRefresh = null;
      }
    })();

    return inflightRefresh;
  },

  async signOut(reason = 'user') {
    const { refreshToken, status } = get();
    if (status === 'signedOut') {
      return;
    }

    if (reason === 'user' && refreshToken) {
      // Best effort: revoke server-side, but never block signing out on the network.
      authApi.logout(refreshToken).catch(() => undefined);
    }

    await secureSession.clear();
    set({
      status: 'signedOut',
      user: null,
      accessToken: null,
      refreshToken: null,
      lastSignOutReason: reason,
    });
    sessionEvents.emit('signedOut');
  },
}));

configureAuthBridge({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshSession: () => useAuthStore.getState().refreshSession(),
  onSessionExpired: () => {
    useAuthStore.getState().signOut('expired').catch(() => undefined);
  },
});
