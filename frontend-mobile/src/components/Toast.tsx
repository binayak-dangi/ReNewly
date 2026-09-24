import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, motion, radii, shadows, spacing } from '../theme';
import { AppText } from './AppText';
import { CircleCheck, Info, TriangleAlert } from './icons';

type ToastTone = 'success' | 'info' | 'error';

interface ToastState {
  message: string | null;
  tone: ToastTone;
  id: number;
  show(message: string, tone?: ToastTone): void;
  hide(): void;
}

export const useToastStore = create<ToastState>(set => ({
  message: null,
  tone: 'success',
  id: 0,
  show: (message, tone = 'success') => set(s => ({ message, tone, id: s.id + 1 })),
  hide: () => set({ message: null }),
}));

/** Short confirmation after an action ("Subscription added."). Callable from anywhere. */
export const toast = {
  success: (message: string) => useToastStore.getState().show(message, 'success'),
  info: (message: string) => useToastStore.getState().show(message, 'info'),
  error: (message: string) => useToastStore.getState().show(message, 'error'),
};

const DURATION_MS = 3500;

const toneIcon = { success: CircleCheck, info: Info, error: TriangleAlert } as const;
const toneColor = { success: '#4ADE80', info: '#93C5FD', error: '#FCA5A5' } as const;

/** Rendered once at the app root, above navigation. Slides up and fades in, then fades out. */
export function ToastHost() {
  const { message, tone, id, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  // Keep showing the last toast while it animates out after the store clears it.
  const [shown, setShown] = useState<{ message: string; tone: ToastTone } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = setTimeout(hide, DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, id, hide]);

  useEffect(() => {
    if (message) {
      setShown({ message, tone });
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.normal,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    const exit = Animated.timing(progress, {
      toValue: 0,
      duration: motion.fast,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    });
    exit.start(({ finished }) => finished && setShown(null));
    return () => exit.stop();
  }, [message, tone, id, progress]);

  if (!shown) {
    return null;
  }

  const Icon = toneIcon[shown.tone];
  const animatedStyle = {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };
  return (
    <View pointerEvents="none" style={[styles.wrapper, { bottom: insets.bottom + 80 }]}>
      <Animated.View style={[styles.toast, animatedStyle]} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Icon size={18} color={toneColor[shown.tone]} />
        <AppText variant="label" tone="inverse" style={styles.text}>
          {shown.message}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 480,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.text,
    ...shadows.raised,
  },
  text: { flexShrink: 1 },
});
