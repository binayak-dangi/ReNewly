import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.disabledSoft, fg: colors.textSecondary },
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Explicit colours, e.g. from urgencyColor(). */
  colorsOverride?: { bg: string; fg: string };
}

export function Badge({ label, tone = 'neutral', colorsOverride }: BadgeProps) {
  const c = colorsOverride ?? tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <AppText variant="caption" color={c.fg} style={styles.text} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
  },
  text: { fontWeight: '600' },
});
