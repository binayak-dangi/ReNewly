import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii } from '../theme';
import { initials } from '../utils/format';
import { AppText } from './AppText';

export interface ServiceAvatarProps {
  name: string;
  /** Hex colour from the catalog (e.g. "#E50914"). Custom services use the brand teal. */
  brandColor?: string | null;
  size?: number;
}

/**
 * Rounded-square avatar with the service's initials on its brand colour.
 * (Third-party logos are trademarks; initials avoid licensing issues and keep the list calm.)
 */
export function ServiceAvatar({ name, brandColor, size = 44 }: ServiceAvatarProps) {
  const background = isHexColor(brandColor) ? brandColor : colors.primary;
  const foreground = isLight(background) ? colors.text : colors.textInverse;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: background }]}>
      <AppText
        variant="bodyStrong"
        color={foreground}
        style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}
        maxFontSizeMultiplier={1}>
        {initials(name)}
      </AppText>
    </View>
  );
}

function isHexColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9a-f]{6}$/i.test(value);
}

/** Relative luminance check so text stays readable on light brand colours. */
function isLight(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45;
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
});
