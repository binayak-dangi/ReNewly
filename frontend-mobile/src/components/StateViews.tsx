import { CloudOff, LucideIcon, TriangleAlert } from './icons';
import React, { useEffect } from 'react';
import { ActivityIndicator, Animated, DimensionValue, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { toApiError } from '../api/errors';
import { colors, motion, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

interface MessageProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBackground?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  style?: ViewStyle;
}

function MessageView({
  icon: Icon,
  iconColor = colors.primary,
  iconBackground = colors.primarySoft,
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  style,
}: MessageProps) {
  return (
    <View style={[styles.message, style]} accessibilityRole="summary">
      <View style={[styles.iconCircle, { backgroundColor: iconBackground }]}>
        <Icon size={28} color={iconColor} strokeWidth={2} />
      </View>
      <AppText variant="headline" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText tone="secondary" align="center" style={styles.messageText}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <Button title={actionLabel} onPress={onAction} />
          {secondaryLabel && onSecondary ? <Button title={secondaryLabel} variant="ghost" onPress={onSecondary} /> : null}
        </View>
      ) : null}
    </View>
  );
}

export type EmptyStateProps = Omit<MessageProps, 'iconColor' | 'iconBackground'>;

/** Friendly, actionable placeholder when a list or screen has no data yet. */
export function EmptyState(props: EmptyStateProps) {
  return <MessageView {...props} />;
}

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  style?: ViewStyle;
}

/** Explains what went wrong (offline vs. server problem) and offers a retry. */
export function ErrorState({ error, onRetry, title, style }: ErrorStateProps) {
  const apiError = toApiError(error);
  const offline = apiError.isNetworkError;

  return (
    <MessageView
      icon={offline ? CloudOff : TriangleAlert}
      iconColor={offline ? colors.textSecondary : colors.danger}
      iconBackground={offline ? colors.disabledSoft : colors.dangerSoft}
      title={title ?? (offline ? "You're offline" : "Couldn't load this")}
      message={apiError.message}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
      style={style}
    />
  );
}

export function LoadingState({ message, style }: { message?: string; style?: ViewStyle }) {
  return (
    <View style={[styles.message, style]} accessibilityRole="progressbar" accessibilityLabel={message ?? 'Loading'}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <AppText tone="secondary">{message}</AppText> : null}
    </View>
  );
}

/**
 * One pulse shared by every skeleton on screen, so they breathe in sync and only one animation runs
 * (on the native thread). It starts with the first mounted skeleton and stops with the last.
 */
const pulse = new Animated.Value(1);
let pulseUsers = 0;
let pulseLoop: Animated.CompositeAnimation | null = null;

function useSharedPulse() {
  useEffect(() => {
    pulseUsers += 1;
    if (pulseUsers === 1) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.45, duration: motion.pulse, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: motion.pulse, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      pulseLoop.start();
    }
    return () => {
      pulseUsers -= 1;
      if (pulseUsers === 0) {
        pulseLoop?.stop();
        pulseLoop = null;
        pulse.setValue(1);
      }
    };
  }, []);
  return pulse;
}

/** Pulsing placeholder block that mirrors the shape of content while it loads. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = radii.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = useSharedPulse();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton, opacity }, style]}
    />
  );
}

const styles = StyleSheet.create({
  message: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
    gap: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  messageText: { maxWidth: 320 },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
});
