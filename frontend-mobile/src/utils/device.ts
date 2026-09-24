import { Platform } from 'react-native';

/** Readable device name for the session list, e.g. "Google Pixel 8". */
export function deviceName(): string | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  const { Brand, Model } = Platform.constants as { Brand?: string; Model?: string };
  const name = [Brand, Model].filter(Boolean).join(' ').trim();
  return name ? name.slice(0, 100) : null;
}

/** The device's IANA time zone (e.g. "Asia/Kathmandu"), so reminders arrive at the right local time. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}
