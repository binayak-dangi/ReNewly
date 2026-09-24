import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, ListRow, ServiceAvatar } from '../../../components';
import { spacing, urgencyColor } from '../../../theme';
import { formatDate, formatMoney, renewalCountdown } from '../../../utils/format';

export interface RenewalRowProps {
  serviceName: string;
  brandColor: string | null;
  planName?: string | null;
  price: number;
  currency: string;
  renewalDate: string;
  /** Omit to hide the countdown badge (e.g. past or cancelled). */
  daysRemaining?: number;
  onPress?: () => void;
}

/** One subscription renewal: who, how much, when. Used on Home, Subscriptions and Calendar. */
export function RenewalRow({
  serviceName,
  brandColor,
  planName,
  price,
  currency,
  renewalDate,
  daysRemaining,
  onPress,
}: RenewalRowProps) {
  const countdown = daysRemaining === undefined ? null : renewalCountdown(daysRemaining);
  const subtitle = [planName, formatDate(renewalDate, 'EEE, MMM d')].filter(Boolean).join(' · ');

  return (
    <ListRow
      title={serviceName}
      subtitle={subtitle}
      leading={<ServiceAvatar name={serviceName} brandColor={brandColor} size={40} />}
      onPress={onPress}
      showChevron={false}
      accessibilityHint={countdown ?? undefined}
      trailing={
        <View style={styles.trailing}>
          <AppText variant="bodyStrong" numeric>
            {formatMoney(price, currency)}
          </AppText>
          {countdown && daysRemaining !== undefined ? (
            <Badge
              label={daysRemaining <= 1 ? countdown.replace('Renews ', '') : `${daysRemaining} days`}
              colorsOverride={urgencyColor(daysRemaining)}
            />
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  trailing: { alignItems: 'flex-end', gap: spacing.xs },
});
