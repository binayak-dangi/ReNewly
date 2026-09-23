import { Eye, EyeOff, LucideIcon } from './icons';
import React, { ComponentRef, ReactNode, Ref, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';
import { AppText } from './AppText';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  /** Adds a show/hide toggle and hides the value. */
  password?: boolean;
  /** Content on the right edge, e.g. a currency code. */
  right?: ReactNode;
  /** React 19 passes refs as a normal prop; lets forms move focus to the next field. */
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

export function TextField({
  label,
  error,
  hint,
  icon: Icon,
  password,
  right,
  editable = true,
  onFocus,
  onBlur,
  ref,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  const helper = error ?? hint;

  return (
    <View style={styles.container}>
      <AppText variant="label" tone="secondary" style={styles.label}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          { borderColor },
          focused || error ? styles.inputRowActive : null,
          !editable && styles.disabled,
        ]}>
        {Icon ? <Icon size={20} color={colors.textMuted} /> : null}
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          secureTextEntry={password && !revealed}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          maxFontSizeMultiplier={1.6}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
        {password ? (
          <Pressable
            onPress={() => setRevealed(r => !r)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}>
            {revealed ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
          </Pressable>
        ) : null}
        {right}
      </View>
      {helper ? (
        <AppText
          variant="caption"
          tone={error ? 'danger' : 'muted'}
          style={styles.helper}
          accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { marginLeft: spacing.xxs },
  inputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    borderWidth: 1,
  },
  inputRowActive: { borderWidth: 1.5 },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  disabled: { backgroundColor: colors.disabledSoft },
  helper: { marginLeft: spacing.xxs },
});
