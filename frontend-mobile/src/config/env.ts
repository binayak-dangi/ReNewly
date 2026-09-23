import { Platform } from 'react-native';

/**
 * Build-time configuration.
 *
 * Development talks to the local API: the Android emulator reaches the host machine at 10.0.2.2.
 * For a physical device on the same Wi-Fi, set DEV_API_HOST to the computer's LAN IP and run the
 * API with `--urls http://0.0.0.0:5080`.
 */
const DEV_API_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const DEV_API_BASE_URL = `http://${DEV_API_HOST}:5080/api/v1`;

// TODO(release): point at the production API before publishing.
const PROD_API_BASE_URL = 'https://api.renewly.app/api/v1';

export const env = {
  apiBaseUrl: __DEV__ ? DEV_API_BASE_URL : PROD_API_BASE_URL,
  /** Keep in sync with versionName in android/app/build.gradle. */
  appVersion: '1.0.0',
  requestTimeoutMs: 15_000,
  supportEmail: 'support@bynqora.com',
  privacyPolicyUrl: 'https://renewly.app/privacy',
  termsUrl: 'https://renewly.app/terms',
} as const;
