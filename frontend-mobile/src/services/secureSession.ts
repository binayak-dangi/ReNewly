import * as SecureStore from 'expo-secure-store';
import type { IsoDateTime, User } from '../api/types';

/**
 * Persists the long-lived session in the Android Keystore / iOS Keychain (via expo-secure-store).
 * The 15-minute access token is never persisted; it lives in memory only.
 */
export interface StoredSession {
  refreshToken: string;
  refreshTokenExpiresAtUtc: IsoDateTime;
  /** Last known profile, so the app can open offline. */
  user: User;
}

const KEY = 'com.bynqora.renewly.session';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureSession = {
  async save(session: StoredSession): Promise<void> {
    await SecureStore.setItemAsync(KEY, JSON.stringify(session), OPTIONS);
  },

  async load(): Promise<StoredSession | null> {
    try {
      const value = await SecureStore.getItemAsync(KEY, OPTIONS);
      if (!value) {
        return null;
      }
      const parsed = JSON.parse(value) as StoredSession;
      return parsed.refreshToken && parsed.user ? parsed : null;
    } catch {
      // Corrupt entry or keystore reset (e.g. device lock screen removed): start fresh.
      await secureSession.clear();
      return null;
    }
  },

  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KEY, OPTIONS);
    } catch {
      // Nothing stored.
    }
  },
};
