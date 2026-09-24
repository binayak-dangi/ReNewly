import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { ChevronRight, CircleCheck, Search, X } from './icons';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectFieldProps {
  label: string;
  value: string | null | undefined;
  options: readonly SelectOption[];
  onChange(value: string): void;
  placeholder?: string;
  error?: string;
  /** Adds a search box (for long lists such as currencies and time zones). */
  searchable?: boolean;
  disabled?: boolean;
}

/** Field that opens a bottom sheet list. Used for currency, category, time zone, language and time. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  error,
  searchable,
  disabled,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const selected = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
      : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      <AppText variant="label" tone="secondary" style={styles.label}>
        {label}
      </AppText>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'not selected'}`}
        accessibilityHint="Opens a list of options"
        style={({ pressed }) => [
          styles.field,
          error ? styles.fieldError : null,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}>
        <AppText tone={selected ? 'default' : 'muted'} style={styles.flex} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </AppText>
        <ChevronRight size={20} color={colors.textMuted} style={styles.chevron} />
      </Pressable>
      {error ? (
        <AppText variant="caption" tone="danger" style={styles.label}>
          {error}
        </AppText>
      ) : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={close} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.sheetHeader}>
            <AppText variant="headline" style={styles.flex} accessibilityRole="header">
              {label}
            </AppText>
            <IconButton icon={X} accessibilityLabel="Close" onPress={close} />
          </View>
          {searchable ? (
            <View style={styles.search}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
                accessibilityLabel={`Search ${label}`}
                style={styles.searchInput}
              />
            </View>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={item => item.value}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <View style={styles.flex}>
                    <AppText variant={isSelected ? 'bodyStrong' : 'body'}>{item.label}</AppText>
                    {item.description ? (
                      <AppText variant="caption" tone="muted">
                        {item.description}
                      </AppText>
                    ) : null}
                  </View>
                  {isSelected ? <CircleCheck size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <AppText tone="muted" align="center" style={styles.empty}>
                No matches
              </AppText>
            }
          />
        </View>
      </Modal>
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
  chevron: { transform: [{ rotate: '90deg' }] },
  pressed: { backgroundColor: colors.surface },
  disabled: { backgroundColor: colors.disabledSoft },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingTop: spacing.sm,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  searchInput: { ...typography.body, flex: 1, color: colors.text, paddingVertical: spacing.sm },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  empty: { padding: spacing.xl },
});
