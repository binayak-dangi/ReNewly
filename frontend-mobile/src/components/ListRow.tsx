import { ChevronRight, LucideIcon } from './icons';
import React, { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing, touchTarget } from '../theme';
import { AppText } from './AppText';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Custom leading element (e.g. ServiceAvatar); overrides `icon`. */
  leading?: ReactNode;
  /** Trailing value text or element. */
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  accessibilityHint?: string;
}

export function ListRow({
  title,
  subtitle,
  icon: Icon,
  leading,
  trailing,
  onPress,
  destructive,
  showChevron = !!onPress,
  accessibilityHint,
}: ListRowProps) {
  const content = (
    <>
      {leading ??
        (Icon ? (
          <View style={[styles.iconBox, destructive && styles.iconBoxDanger]}>
            <Icon size={20} color={destructive ? colors.danger : colors.primary} />
          </View>
        ) : null)}
      <View style={styles.text}>
        <AppText variant="bodyStrong" tone={destructive ? 'danger' : 'default'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {typeof trailing === 'string' ? (
        <AppText variant="label" tone="secondary" numeric>
          {trailing}
        </AppText>
      ) : (
        trailing
      )}
      {showChevron ? <ChevronRight size={20} color={colors.textMuted} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.ripple }}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && Platform.OS === 'ios' && styles.pressed]}>
      {content}
    </Pressable>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="headline" accessibilityRole="header">
        {title}
      </AppText>
      {action}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: colors.surface },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDanger: { backgroundColor: colors.dangerSoft },
  text: { flex: 1, gap: spacing.xxs },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
