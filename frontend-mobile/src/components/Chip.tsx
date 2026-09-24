import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { Crown, LucideIcon } from './icons';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Shows a crown and dims the chip: the option needs Pro. Still pressable (to explain/upsell). */
  locked?: boolean;
  icon?: LucideIcon;
}

export function Chip({ label, selected = false, onPress, disabled, locked, icon: Icon }: ChipProps) {
  const fg = selected ? colors.onPrimary : locked ? colors.textMuted : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: selected ? colors.rippleOnPrimary : colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}, Pro feature` : label}
      accessibilityState={{ selected, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        pressed && !selected && Platform.OS === 'ios' && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {Icon ? <Icon size={16} color={fg} /> : null}
      <AppText variant="label" color={fg}>
        {label}
      </AppText>
      {locked ? <Crown size={14} color={colors.warning} /> : null}
    </Pressable>
  );
}

export interface ChipGroupProps<T extends string | number> {
  options: readonly { value: T; label: string; locked?: boolean }[];
  /** Single value, or an array for multi-select. */
  value: T | readonly T[] | null | undefined;
  onChange(value: T): void;
  accessibilityLabel?: string;
}

/** Wrapping row of chips. The caller decides toggle semantics in onChange. */
export function ChipGroup<T extends string | number>({ options, value, onChange, accessibilityLabel }: ChipGroupProps<T>) {
  const isSelected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <View style={styles.group} accessibilityLabel={accessibilityLabel}>
      {options.map(option => (
        <Chip
          key={String(option.value)}
          label={option.label}
          locked={option.locked}
          selected={isSelected(option.value)}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    overflow: 'hidden', // clips the ripple to the pill shape
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  unselected: { backgroundColor: colors.background, borderColor: colors.border },
  pressed: { backgroundColor: colors.surface },
  disabled: { opacity: 0.5 },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
