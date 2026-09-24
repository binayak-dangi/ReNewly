import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Build-time configuration.
 *
 * Development talks to the local API on port 5080 of the computer running `npm start`.
 * In Expo Go the phone already knows that computer's address (it loaded the app from it), so the
 * API host is taken from there; run the API with `--urls http://0.0.0.0:5080` so the phone can reach it.
 * Without it (e.g. an emulator started another way), fall back to the Android emulator's host address.
 */
const METRO_HOST = Constants.expoConfig?.hostUri?.split(':')[0];
const DEV_API_HOST = METRO_HOST || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
const DEV_API_BASE_URL = `http://${DEV_API_HOST}:5080/api/v1`;

// TODO(release): point at the production API before publishing.
const PROD_API_BASE_URL = 'https://api.renewly.app/api/v1';

export const env = {
  apiBaseUrl: __DEV__ ? DEV_API_BASE_URL : PROD_API_BASE_URL,
  /** Keep in sync with expo.version in app.json. */
  appVersion: '1.0.0',
  requestTimeoutMs: 15_000,
  supportEmail: 'support@bynqora.com',
  privacyPolicyUrl: 'https://renewly.app/privacy',
  termsUrl: 'https://renewly.app/terms',
} as const;
