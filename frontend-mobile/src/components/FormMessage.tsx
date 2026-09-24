import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { Info, TriangleAlert } from './icons';

/** Inline banner above a form, for errors that do not belong to one field (or for notices). */
export function FormMessage({ message, tone = 'error' }: { message: string | null | undefined; tone?: 'error' | 'info' }) {
  if (!message) {
    return null;
  }
  const error = tone === 'error';
  const Icon = error ? TriangleAlert : Info;

  return (
    <View
      style={[styles.box, error ? styles.error : styles.info]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Icon size={18} color={error ? colors.danger : colors.info} />
      <AppText variant="label" color={error ? colors.danger : colors.info} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radii.md,
  },
  error: { backgroundColor: colors.dangerSoft },
  info: { backgroundColor: colors.infoSoft },
  text: { flex: 1 },
});
