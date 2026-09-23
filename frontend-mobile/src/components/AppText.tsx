import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { colors, typography, TypographyVariant } from '../theme';

export type TextTone = 'default' | 'secondary' | 'muted' | 'primary' | 'inverse' | 'danger' | 'success' | 'warning';

const toneColor: Record<TextTone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  primary: colors.primary,
  inverse: colors.textInverse,
  danger: colors.danger,
  success: colors.success,
  warning: colors.warning,
};

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  /** Overrides `tone`, e.g. for urgency colours. */
  color?: string;
  align?: TextStyle['textAlign'];
  /** Tabular figures so amounts and dates align in lists. */
  numeric?: boolean;
}

/** The only text component screens should use, so typography stays consistent. */
export function AppText({
  variant = 'body',
  tone = 'default',
  color,
  align,
  numeric,
  style,
  maxFontSizeMultiplier = 1.6,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        typography[variant],
        { color: color ?? toneColor[tone] },
        align ? { textAlign: align } : null,
        numeric ? styles.numeric : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  numeric: { fontVariant: ['tabular-nums'] },
});
