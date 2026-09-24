import React, { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { AppText } from './AppText';
import type { TextInputHandle } from './TextField';

export interface CodeInputProps {
  value: string;
  onChangeText(value: string): void;
  length?: number;
  error?: string;
  autoFocus?: boolean;
  /** Called once all digits are entered. */
  onComplete?(value: string): void;
}

/**
 * Six boxes backed by one hidden input, so paste and the keyboard's one-time-code suggestion work.
 */
export function CodeInput({ value, onChangeText, length = 6, error, autoFocus, onComplete }: CodeInputProps) {
  const inputRef = useRef<TextInputHandle>(null);
  const digits = value.split('');

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.boxes}
        accessibilityRole="none"
        importantForAccessibility="no-hide-descendants">
        {Array.from({ length }, (_, i) => {
          const active = i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={[styles.box, active && styles.boxActive, !!error && styles.boxError, !!digits[i] && styles.boxFilled]}>
              <AppText variant="title" numeric maxFontSizeMultiplier={1.2}>
                {digits[i] ?? ''}
              </AppText>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={text => {
          const clean = text.replace(/\D/g, '').slice(0, length);
          onChangeText(clean);
          if (clean.length === length) {
            onComplete?.(clean);
          }
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        accessibilityLabel={`${length}-digit code`}
        accessibilityHint={error}
        style={styles.hiddenInput}
      />
      {error ? (
        <AppText variant="caption" tone="danger" align="center" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  box: {
    flex: 1,
    maxWidth: 52,
    aspectRatio: 0.85,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.borderStrong },
  boxActive: { borderColor: colors.primary, borderWidth: 1.5 },
  boxError: { borderColor: colors.danger },
  // Kept in the layout (not display:none) so autofill and focus still work.
  hiddenInput: { ...typography.body, position: 'absolute', opacity: 0, height: 1, width: 1 },
});
