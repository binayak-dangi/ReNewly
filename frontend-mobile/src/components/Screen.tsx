import React, { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { OfflineBanner } from './OfflineBanner';

export interface ScreenProps extends PropsWithChildren {
  /** Scrollable content (default). Use false for screens that manage their own FlatList. */
  scroll?: boolean;
  /** Pull-to-refresh for scrollable screens. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Fixed content above the scroll area (e.g. a custom header). */
  header?: ReactNode;
  /** Fixed content pinned to the bottom (e.g. a primary action). */
  footer?: ReactNode;
  background?: 'surface' | 'background';
  padded?: boolean;
  /** Safe-area edges; tab screens omit the bottom because the tab bar handles it. */
  edges?: Edge[];
  keyboardAware?: boolean;
  contentStyle?: ViewStyle;
}

/** Standard screen container: safe area, background, offline banner, optional scroll and keyboard handling. */
export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  header,
  footer,
  background = 'surface',
  padded = true,
  edges = ['top', 'left', 'right', 'bottom'],
  keyboardAware = false,
  contentStyle,
}: ScreenProps) {
  const bg = background === 'surface' ? colors.surface : colors.background;
  const padding = padded ? styles.padded : null;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        ) : undefined
      }>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: bg }]}>
      <StatusBar barStyle="dark-content" />
      <OfflineBanner />
      {header}
      {keyboardAware ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      ) : (
        <>
          {body}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, gap: spacing.lg },
  padded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
});
