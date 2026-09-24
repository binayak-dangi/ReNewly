import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, radii, shadows, spacing } from '../theme';
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

/** Rendered once at the app root, above navigation. */
export function ToastHost() {
  const { message, tone, id, hide } = useToastStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = setTimeout(hide, DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, id, hide]);

  if (!message) {
    return null;
  }

  const Icon = toneIcon[tone];
  return (
    <View pointerEvents="none" style={[styles.wrapper, { bottom: insets.bottom + 80 }]}>
      <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Icon size={18} color={toneColor[tone]} />
        <AppText variant="label" tone="inverse" style={styles.text}>
          {message}
        </AppText>
      </View>
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
