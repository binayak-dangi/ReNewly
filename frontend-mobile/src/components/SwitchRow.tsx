import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { Crown, LucideIcon } from './icons';

export interface SwitchRowProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange(value: boolean): void;
  icon?: LucideIcon;
  disabled?: boolean;
  /** Pro-only: shows a crown; pressing calls onLockedPress instead of toggling. */
  locked?: boolean;
  onLockedPress?: () => void;
}

export function SwitchRow({ title, description, value, onValueChange, icon: Icon, disabled, locked, onLockedPress }: SwitchRowProps) {
  const toggle = () => (locked ? onLockedPress?.() : onValueChange(!value));
  return (
    <Pressable
      onPress={toggle}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={locked ? `${title}, Pro feature` : title}
      accessibilityHint={description}
      accessibilityState={{ checked: value && !locked, disabled: !!disabled }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {Icon ? <Icon size={20} color={colors.primary} /> : null}
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong">{title}</AppText>
          {locked ? <Crown size={14} color={colors.warning} /> : null}
        </View>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value && !locked}
        onValueChange={toggle}
        disabled={disabled}
        trackColor={{ false: colors.borderStrong, true: colors.primaryMuted }}
        thumbColor={value && !locked ? colors.primary : colors.background}
        importantForAccessibility="no"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: colors.surface },
  text: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
