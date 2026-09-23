import type { LucideIcon } from './icons';
import React from 'react';
import { Pressable, PressableProps, StyleSheet, View } from 'react-native';
import { colors, radii, touchTarget } from '../theme';
import { AppText } from './AppText';

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  icon: LucideIcon;
  /** Required: icon-only buttons need a spoken label. */
  accessibilityLabel: string;
  color?: string;
  size?: number;
  /** Small count bubble, e.g. unread notifications. */
  badgeCount?: number;
}

export function IconButton({ icon: Icon, color = colors.text, size = 22, badgeCount, ...rest }: IconButtonProps) {
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      hitSlop={4}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Icon size={size} color={color} strokeWidth={2} />
      {badgeCount ? (
        <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no">
          <AppText variant="caption" tone="inverse" style={styles.badgeText}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surface },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700' },
});
