import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Renewly design tokens. One brand colour (teal) on a clean light surface.
 * Text colours meet WCAG AA (≥ 4.5:1) on both `background` and `surface`.
 */
export const colors = {
  // Brand
  primary: '#0F766E', // teal-700 – buttons, links, active tab (5.5:1 on white)
  primaryPressed: '#115E59',
  primarySoft: '#F0FDFA', // tinted backgrounds
  primaryMuted: '#CCFBF1',
  onPrimary: '#FFFFFF',

  // Surfaces
  background: '#FFFFFF',
  surface: '#F8FAFC', // screen background behind cards
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  overlay: 'rgba(15, 23, 42, 0.45)',

  // Text
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',

  // Status
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
  success: '#15803D',
  successSoft: '#F0FDF4',
  info: '#1D4ED8',
  infoSoft: '#EFF6FF',

  // Misc
  skeleton: '#E2E8F0',
  disabled: '#94A3B8',
  disabledSoft: '#F1F5F9',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

const fontFamily = Platform.select({ android: 'sans-serif', default: undefined });
const fontFamilyMedium = Platform.select({ android: 'sans-serif-medium', default: undefined });

/** Type scale. Numbers use tabular figures so amounts line up in lists. */
export const typography = {
  display: { fontFamily, fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontFamily, fontSize: 24, lineHeight: 32, fontWeight: '700', letterSpacing: -0.25 },
  headline: { fontFamily: fontFamilyMedium, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontFamily: fontFamilyMedium, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontFamily, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  amount: { fontFamily, fontSize: 28, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** Subtle elevation – cards should feel lifted, not floating. */
export const shadows = {
  none: {},
  card: Platform.select<ViewStyle>({
    android: { elevation: 1 },
    default: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
  }),
  raised: Platform.select<ViewStyle>({
    android: { elevation: 3 },
    default: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
  }),
} as const;

/** Minimum touch target (Material guidance: 48dp). */
export const touchTarget = 48;
