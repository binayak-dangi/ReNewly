import type { SelectOption } from '../../components';

/** Common IANA time zones. The device's own zone is always added on top (see timeZoneOptions). */
const COMMON_TIME_ZONES = [
  'UTC',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Manila',
  'Asia/Jakarta',
  'Asia/Bangkok',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Warsaw',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Pacific/Honolulu',
];

const label = (zone: string) => zone.replace(/_/g, ' ').replace('/', ' / ');

export function timeZoneOptions(...extra: (string | null | undefined)[]): SelectOption[] {
  const zones = [...new Set([...extra.filter((z): z is string => !!z), ...COMMON_TIME_ZONES])];
  return zones.map(zone => ({ value: zone, label: label(zone) }));
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ne: 'नेपाली (Nepali)',
  hi: 'हिन्दी (Hindi)',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  de: 'Deutsch (German)',
};

export function languageOptions(codes: readonly string[] = Object.keys(LANGUAGE_NAMES)): SelectOption[] {
  return codes.map(code => ({ value: code, label: LANGUAGE_NAMES[code] ?? code }));
}

/** 06:00 to 22:00 every 30 minutes, as "HH:mm:ss" values. */
export function reminderTimeOptions(): SelectOption[] {
  const options: SelectOption[] = [];
  for (let minutes = 6 * 60; minutes <= 22 * 60; minutes += 30) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    options.push({ value, label: `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` });
  }
  return options;
}
