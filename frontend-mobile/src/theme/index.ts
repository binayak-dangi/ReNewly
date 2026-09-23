import { colors, radii, shadows, spacing, touchTarget, typography } from './tokens';

export * from './tokens';

export const theme = { colors, spacing, radii, typography, shadows, touchTarget } as const;

/** Colour for "renews in N days": red for today/tomorrow, amber within 3 days, neutral after. */
export function urgencyColor(daysRemaining: number): { fg: string; bg: string } {
  if (daysRemaining <= 1) {
    return { fg: colors.danger, bg: colors.dangerSoft };
  }
  if (daysRemaining <= 3) {
    return { fg: colors.warning, bg: colors.warningSoft };
  }
  return { fg: colors.primary, bg: colors.primarySoft };
}
