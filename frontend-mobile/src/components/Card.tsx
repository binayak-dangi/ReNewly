import React, { PropsWithChildren } from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '../theme';

export interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  /** Spoken label when the whole card is tappable. */
  accessibilityLabel?: string;
  padding?: keyof typeof spacing;
  /** Tinted background for highlighted content (e.g. the next renewal). */
  tone?: 'default' | 'primary';
  style?: ViewStyle;
}

export function Card({ children, onPress, accessibilityLabel, padding = 'lg', tone = 'default', style }: CardProps) {
  const base = [
    styles.card,
    { padding: spacing[padding] },
    tone === 'primary' ? styles.primary : null,
    style,
  ];

  if (!onPress) {
    return <View style={base}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...base, styles.clipRipple, pressed && Platform.OS === 'ios' && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  primary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
  },
  pressed: { opacity: 0.85 },
  // Clip the Android ripple to the rounded corners (on iOS this would also clip the shadow).
  clipRipple: Platform.OS === 'android' ? { overflow: 'hidden' } : {},
});
