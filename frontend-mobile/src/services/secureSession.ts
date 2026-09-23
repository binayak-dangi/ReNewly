import * as Keychain from 'react-native-keychain';
import type { IsoDateTime, User } from '../api/types';

/**
 * Persists the long-lived session in the Android Keystore / iOS Keychain.
 * The 15-minute access token is never persisted; it lives in memory only.
 */
export interface StoredSession {
  refreshToken: string;
  refreshTokenExpiresAtUtc: IsoDateTime;
  /** Last known profile, so the app can open offline. */
  user: User;
}

const SERVICE = 'com.bynqora.renewly.session';
const ACCOUNT = 'renewly';

export const secureSession = {
  async save(session: StoredSession): Promise<void> {
    await Keychain.setGenericPassword(ACCOUNT, JSON.stringify(session), {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async load(): Promise<StoredSession | null> {
    try {
      const entry = await Keychain.getGenericPassword({ service: SERVICE });
      if (!entry) {
        return null;
      }
      const parsed = JSON.parse(entry.password) as StoredSession;
      return parsed.refreshToken && parsed.user ? parsed : null;
    } catch {
      // Corrupt entry or keystore reset (e.g. device lock screen removed): start fresh.
      await secureSession.clear();
      return null;
    }
  },

  async clear(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: SERVICE });
    } catch {
      // Nothing stored.
    }
  },
};
