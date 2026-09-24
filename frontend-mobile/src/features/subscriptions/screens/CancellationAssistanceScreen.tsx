import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../../api/errors';
import { goBackOrHome } from '../../../app/navigation/goBack';
import type { RootScreenProps } from '../../../app/navigation/types';
import { AppText, Button, Card, ErrorState, FormMessage, LoadingState, Screen, SectionHeader, toast } from '../../../components';
import { CircleCheck, ExternalLink, Info } from '../../../components/icons';
import { colors, radii, spacing } from '../../../theme';
import { formatDate, formatMoney } from '../../../utils/format';
import { useCancellationGuide, useSubscription, useSubscriptionActions } from '../hooks';

/**
 * Helps the user cancel with the provider. Renewly cannot cancel third-party subscriptions,
 * and this screen says so plainly before anything else.
 */
export function CancellationAssistanceScreen({ navigation, route }: RootScreenProps<'CancellationAssistance'>) {
  const { id } = route.params;
  const subscription = useSubscription(id);
  const guide = useCancellationGuide(id);
  const { markCancelled } = useSubscriptionActions(id);

  if (guide.isPending || subscription.isPending) {
    return <LoadingState message="Loading cancellation steps…" />;
  }
  if (!guide.data || !subscription.data) {
    return (
      <ErrorState
        error={guide.error ?? subscription.error}
        onRetry={() => {
          guide.refetch();
          subscription.refetch();
        }}
      />
    );
  }

  const g = guide.data;
  const s = subscription.data.subscription;
  const alreadyCancelled = s.status !== 'Active';

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast.error("Couldn't open the page. Try again from a browser.");
    }
  };

  const confirmCancelled = () =>
    Alert.alert(
      `Did you cancel ${s.serviceName}?`,
      `Only mark it as cancelled after the provider has confirmed. Renewly will stop reminding you about it.`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, mark as cancelled',
          onPress: () =>
            markCancelled.mutate(undefined, {
              onSuccess: () => {
                toast.success(`${s.serviceName} marked as cancelled.`);
                goBackOrHome(navigation);
              },
              onError: e => toast.error(errorMessage(e)),
            }),
        },
      ],
    );

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      footer={
        alreadyCancelled ? null : (
          <>
            {g.cancellationUrl ? (
              <Button title="Open official cancellation page" icon={ExternalLink} onPress={() => openUrl(g.cancellationUrl!)} />
            ) : null}
            <Button
              title="I've cancelled – mark as cancelled"
              variant={g.cancellationUrl ? 'secondary' : 'primary'}
              icon={CircleCheck}
              onPress={confirmCancelled}
              loading={markCancelled.isPending}
            />
          </>
        )
      }>
      <View style={styles.notice} accessibilityRole="alert">
        <Info size={20} color={colors.info} />
        <AppText variant="label" color={colors.info} style={styles.flex}>
          {g.disclaimer}
        </AppText>
      </View>

      <View>
        <AppText variant="title" accessibilityRole="header">
          Cancel {g.serviceName}
        </AppText>
        {!alreadyCancelled ? (
          <AppText tone="secondary" style={styles.deadline}>
            Cancel before <AppText variant="bodyStrong">{formatDate(s.nextRenewalDate, 'MMMM d')}</AppText> to avoid being
            charged <AppText variant="bodyStrong">{formatMoney(s.price, s.currency)}</AppText>.
          </AppText>
        ) : (
          <FormMessage tone="info" message="You've already marked this subscription as cancelled." />
        )}
      </View>

      <SectionHeader title="Steps" />
      <Card>
        <View style={styles.steps}>
          {g.steps.map((step, index) => (
            <View key={step} style={styles.step} accessibilityLabel={`Step ${index + 1}: ${step}`}>
              <View style={styles.stepNumber}>
                <AppText variant="label" tone="primary" style={styles.bold}>
                  {index + 1}
                </AppText>
              </View>
              <AppText style={styles.flex}>{step}</AppText>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <AppText variant="bodyStrong">Subscribed through Google Play?</AppText>
        <AppText variant="label" tone="secondary" style={styles.storeNote}>
          {g.storeBillingNote}
        </AppText>
        <Button
          title="Open Google Play subscriptions"
          variant="ghost"
          size="md"
          fullWidth={false}
          icon={ExternalLink}
          onPress={() => openUrl(g.googlePlaySubscriptionsUrl)}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.infoSoft,
  },
  deadline: { marginTop: spacing.sm },
  steps: { gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeNote: { marginTop: spacing.xs, marginBottom: spacing.xs },
});
