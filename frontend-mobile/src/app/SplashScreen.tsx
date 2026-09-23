import { RefreshCcw } from '../components/icons';
import React from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { AppText } from '../components';
import { colors, radii, spacing } from '../theme';

/** Shown while the stored session is restored. Matches the native launch background (white). */
export function SplashScreen() {
  return (
    <View style={styles.container} accessibilityLabel="Renewly is loading">
      <StatusBar barStyle="dark-content" />
      <View style={styles.mark}>
        <RefreshCcw size={36} color={colors.onPrimary} strokeWidth={2.4} />
      </View>
      <AppText variant="title">Renewly</AppText>
      <AppText tone="secondary" align="center" style={styles.tagline}>
        Know before you're charged.{'\n'}Cancel before you renew.
      </AppText>
      <ActivityIndicator color={colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tagline: { maxWidth: 280 },
  spinner: { marginTop: spacing.xxl },
});
