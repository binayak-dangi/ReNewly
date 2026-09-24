import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { formatDate, parseIsoDate, toIsoDate } from '../utils/format';
import { AppText } from './AppText';
import { CalendarDays } from './icons';

export interface DateFieldProps {
  label: string;
  /** yyyy-MM-dd */
  value: string | null | undefined;
  onChange(value: string): void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
  hint?: string;
}

/** Date input using the platform picker (Material dialog on Android). Values are yyyy-MM-dd. */
export function DateField({ label, value, onChange, minimumDate, maximumDate, error, hint }: DateFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const current = value ? parseIsoDate(value) : new Date();

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            onChange(toIsoDate(date));
          }
        },
      });
    } else {
      setIosOpen(o => !o);
    }
  };

  return (
    <View style={styles.container}>
      <AppText variant="label" tone="secondary" style={styles.label}>
        {label}
      </AppText>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value, 'MMMM d, yyyy') : 'not set'}`}
        accessibilityHint="Opens a date picker"
        android_ripple={{ color: colors.ripple }}
        style={({ pressed }) => [
          styles.field,
          error ? styles.fieldError : null,
          pressed && Platform.OS === 'ios' && styles.pressed,
        ]}>
        <CalendarDays size={20} color={colors.textMuted} />
        <AppText tone={value ? 'default' : 'muted'} style={styles.flex}>
          {value ? formatDate(value, 'EEE, MMM d, yyyy') : 'Select a date'}
        </AppText>
      </Pressable>
      {iosOpen ? (
        <DateTimePicker
          value={current}
          mode="date"
          display="inline"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_event, date) => date && onChange(toIsoDate(date))}
        />
      ) : null}
      {error || hint ? (
        <AppText variant="caption" tone={error ? 'danger' : 'muted'} style={styles.label}>
          {error ?? hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { marginLeft: spacing.xxs },
  flex: { flex: 1 },
  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  fieldError: { borderColor: colors.danger, borderWidth: 1.5 },
  pressed: { backgroundColor: colors.surface },
});
