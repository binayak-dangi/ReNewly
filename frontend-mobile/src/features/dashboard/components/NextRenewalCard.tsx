import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { UpcomingRenewal } from '../../../api/types';
import { AppText, Badge, Button, Card, ServiceAvatar } from '../../../components';
import { spacing, urgencyColor } from '../../../theme';
import { formatDate, formatPrice, renewalCountdown } from '../../../utils/format';

interface Props {
  renewal: UpcomingRenewal;
  onOpen(): void;
  onCancelHelp(): void;
}

/**
 * The single most important fact on the dashboard: what renews next, for how much, and when.
 * Designed to be understood in 2–3 seconds.
 */
export function NextRenewalCard({ renewal, onOpen, onCancelHelp }: Props) {
  const countdown = renewalCountdown(renewal.daysRemaining);
  const urgency = urgencyColor(renewal.daysRemaining);
  const price = formatPrice(renewal.price, renewal.currency, renewal.billingCycle);

  return (
    <Card
      tone="primary"
      padding="xl"
      onPress={onOpen}
      accessibilityLabel={`Next renewal: ${renewal.serviceName}, ${price}, ${countdown}, on ${formatDate(renewal.renewalDate, 'MMMM d')}`}>
      <AppText variant="caption" tone="primary" style={styles.eyebrow}>
        NEXT RENEWAL
      </AppText>

      <View style={styles.row}>
        <ServiceAvatar name={renewal.serviceName} brandColor={renewal.brandColor} size={52} />
        <View style={styles.names}>
          <AppText variant="headline" numberOfLines={1}>
            {renewal.serviceName}
          </AppText>
          {renewal.planName ? (
            <AppText variant="label" tone="secondary" numberOfLines={1}>
              {renewal.planName}
            </AppText>
          ) : null}
        </View>
      </View>

      <AppText variant="amount" style={styles.amount}>
        {price}
      </AppText>

      <View style={styles.whenRow}>
        <Badge label={countdown} colorsOverride={urgency} />
        <AppText variant="label" tone="secondary">
          {formatDate(renewal.renewalDate, 'EEEE, MMMM d')}
        </AppText>
      </View>

      <Button
        title="How to cancel before it renews"
        variant="outline"
        size="md"
        onPress={onCancelHelp}
        style={styles.cancel}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontWeight: '700', letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  names: { flex: 1, gap: spacing.xxs },
  amount: { marginTop: spacing.lg },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm },
  cancel: { marginTop: spacing.lg },
});
