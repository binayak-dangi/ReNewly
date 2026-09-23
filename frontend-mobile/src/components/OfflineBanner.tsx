import { WifiOff } from './icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useOnline } from '../hooks/useOnline';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';

/** Thin banner shown while offline; cached data stays visible underneath. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) {
    return null;
  }

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <WifiOff size={16} color={colors.textInverse} />
      <AppText variant="label" tone="inverse">
        You're offline. Showing saved data.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.textSecondary,
  },
});
