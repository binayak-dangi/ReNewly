import type { LucideIcon } from './icons';
import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface VariantStyle {
  bg: string;
  bgPressed: string;
  fg: string;
  border?: string;
}

const variants: Record<ButtonVariant, VariantStyle> = {
  primary: { bg: colors.primary, bgPressed: colors.primaryPressed, fg: colors.onPrimary },
  secondary: { bg: colors.primarySoft, bgPressed: colors.primaryMuted, fg: colors.primary },
  outline: { bg: colors.background, bgPressed: colors.surface, fg: colors.text, border: colors.borderStrong },
  ghost: { bg: 'transparent', bgPressed: colors.surface, fg: colors.primary },
  danger: { bg: colors.dangerSoft, bgPressed: '#FEE2E2', fg: colors.danger },
};

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled,
  icon: Icon,
  fullWidth = true,
  style,
  accessibilityHint,
  ...rest
}: ButtonProps) {
  const v = variants[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        fullWidth ? styles.fullWidth : styles.inline,
        {
          backgroundColor: isDisabled && variant === 'primary' ? colors.disabled : pressed ? v.bgPressed : v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? StyleSheet.hairlineWidth * 2 : 0,
          opacity: isDisabled && variant !== 'primary' ? 0.55 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : v.fg} />
      ) : (
        <View style={styles.content}>
          {Icon ? <Icon size={18} color={v.fg} strokeWidth={2.2} /> : null}
          <AppText variant="bodyStrong" color={v.fg} numberOfLines={1}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  lg: { minHeight: 52 },
  md: { minHeight: touchTarget },
  fullWidth: { alignSelf: 'stretch' },
  inline: { alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
