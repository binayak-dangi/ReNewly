import React, { useLayoutEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../../api/errors';
import type { Reminder, ReminderStatus } from '../../../api/types';
import { goBackOrHome } from '../../../app/navigation/goBack';
import type { RootScreenProps } from '../../../app/navigation/types';
import {
  AppText,
  Badge,
  BadgeTone,
  Button,
  Card,
  Divider,
  ErrorState,
  IconButton,
  ListRow,
  LoadingState,
  Screen,
  SectionHeader,
  ServiceAvatar,
  toast,
} from '../../../components';
import { Bell, CalendarDays, CreditCard, Layers, Mail, Pencil, RotateCcw, StickyNote, Trash } from '../../../components/icons';
import { colors, spacing, urgencyColor } from '../../../theme';
import { billingCycleLabel, formatDate, formatDateTime, formatMoney, formatPrice, renewalCountdown } from '../../../utils/format';
import { useSubscription, useSubscriptionActions } from '../hooks';
import { categoryLabel, reminderLabel } from '../labels';

const REMINDER_STATUS: Record<ReminderStatus, { label: string; tone: BadgeTone }> = {
  Scheduled: { label: 'Scheduled', tone: 'primary' },
  Processing: { label: 'Sending', tone: 'info' },
  Sent: { label: 'Sent', tone: 'success' },
  Failed: { label: 'Failed', tone: 'danger' },
  Skipped: { label: 'Skipped', tone: 'neutral' },
  Cancelled: { label: 'Off', tone: 'neutral' },
};

export function SubscriptionDetailScreen({ navigation, route }: RootScreenProps<'SubscriptionDetail'>) {
  const { id } = route.params;
  const { data, error, isPending, isRefetching, refetch } = useSubscription(id);
  const { reactivate, remove } = useSubscriptionActions(id);

  const loaded = !!data;
  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: loaded ? editButton(() => navigation.navigate('SubscriptionForm', { id })) : undefined,
    });
  }, [navigation, id, loaded]);

  if (isPending) {
    return <LoadingState message="Loading subscription…" />;
  }
  if (!data) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  const s = data.subscription;
  const active = s.status === 'Active';
  const reminders = [...data.reminderSchedule].sort((a, b) => a.scheduledForUtc.localeCompare(b.scheduledForUtc));

  const confirmDelete = () =>
    Alert.alert(
      `Delete ${s.serviceName}?`,
      'This removes it and its reminders from Renewly. It does not cancel the subscription with the provider.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            remove.mutate(undefined, {
              onSuccess: () => {
                toast.success(`${s.serviceName} deleted.`);
                goBackOrHome(navigation);
              },
              onError: e => toast.error(errorMessage(e)),
            }),
        },
      ],
    );

  const doReactivate = () =>
    reactivate.mutate(undefined, {
      onSuccess: () => toast.success('Reminders are back on.'),
      onError: e => {
        const message = errorMessage(e);
        Alert.alert("Couldn't reactivate", message, [
          { text: 'OK', style: 'cancel' },
          { text: 'See Pro', onPress: () => navigation.navigate('Premium') },
        ]);
      },
    });

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefetching} onRefresh={() => refetch()}>
      <Card padding="xl" tone={active ? 'primary' : 'default'}>
        <View style={styles.titleRow}>
          <ServiceAvatar name={s.serviceName} brandColor={s.brandColor} size={56} />
          <View style={styles.flex}>
            <AppText variant="title" numberOfLines={2} accessibilityRole="header">
              {s.serviceName}
            </AppText>
            {s.planName ? <AppText tone="secondary">{s.planName}</AppText> : null}
          </View>
        </View>

        <AppText variant="amount" style={styles.amount}>
          {formatPrice(s.price, s.currency, s.billingCycle)}
        </AppText>

        {active ? (
          <View style={styles.whenRow}>
            <Badge label={renewalCountdown(s.daysUntilRenewal)} colorsOverride={urgencyColor(s.daysUntilRenewal)} />
            <AppText variant="label" tone="secondary">
              {formatDate(s.nextRenewalDate, 'EEEE, MMMM d, yyyy')}
            </AppText>
          </View>
        ) : (
          <View style={styles.whenRow}>
            <Badge label="Marked as cancelled" />
            {s.cancelledAtUtc ? (
              <AppText variant="label" tone="secondary">
                on {formatDate(s.cancelledAtUtc.slice(0, 10), 'MMMM d, yyyy')}
              </AppText>
            ) : null}
          </View>
        )}
      </Card>

      {active ? (
        <Button
          title="Cancel this subscription"
          variant="outline"
          onPress={() => navigation.navigate('CancellationAssistance', { id })}
          accessibilityHint="Shows how to cancel with the provider"
        />
      ) : (
        <Button title="Reactivate reminders" variant="secondary" icon={RotateCcw} onPress={doReactivate} loading={reactivate.isPending} />
      )}

      <SectionHeader title="Details" />
      <Card padding="none">
        <ListRow title="Billing cycle" icon={CalendarDays} trailing={billingCycleLabel(s.billingCycle)} />
        <Divider inset={spacing.lg} />
        <ListRow title="Monthly equivalent" icon={Layers} trailing={formatMoney(s.monthlyCost, s.currency)} />
        <Divider inset={spacing.lg} />
        <ListRow title="Yearly equivalent" icon={Layers} trailing={formatMoney(s.yearlyCost, s.currency)} />
        <Divider inset={spacing.lg} />
        <ListRow title="Category" icon={Layers} trailing={categoryLabel(s.category)} />
        <Divider inset={spacing.lg} />
        <ListRow title="Payment method" icon={CreditCard} trailing={s.paymentMethodLabel ?? 'Not set'} />
      </Card>

      <SectionHeader title="Reminders" />
      <Card padding="none">
        <ListRow
          title={s.reminderDaysBefore.length ? s.reminderDaysBefore.map(reminderLabel).join(', ') : 'No reminders'}
          subtitle={[s.pushReminderEnabled && 'Push', s.emailReminderEnabled && 'Email'].filter(Boolean).join(' + ') || 'All channels off'}
          icon={Bell}
        />
        {active && reminders.length > 0 ? (
          reminders.map(reminder => (
            <View key={reminder.id}>
              <Divider inset={spacing.lg} />
              <ReminderRow reminder={reminder} />
            </View>
          ))
        ) : active ? (
          <>
            <Divider inset={spacing.lg} />
            <AppText variant="caption" tone="muted" style={styles.note}>
              No reminders are scheduled for this renewal (the reminder time may already have passed, or reminders are off).
            </AppText>
          </>
        ) : null}
      </Card>

      {s.notes ? (
        <>
          <SectionHeader title="Notes" />
          <Card>
            <View style={styles.notesRow}>
              <StickyNote size={18} color={colors.textMuted} />
              <AppText style={styles.flex}>{s.notes}</AppText>
            </View>
          </Card>
        </>
      ) : null}

      <Button title="Delete from Renewly" variant="danger" icon={Trash} onPress={confirmDelete} loading={remove.isPending} />
      <AppText variant="caption" tone="muted" align="center">
        Added {formatDate(s.createdAtUtc.slice(0, 10))}
      </AppText>
    </Screen>
  );
}

/** Header button factory, defined outside render (react/no-unstable-nested-components). */
function editButton(onPress: () => void) {
  return function EditButton() {
    return <IconButton icon={Pencil} accessibilityLabel="Edit subscription" onPress={onPress} />;
  };
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const status = REMINDER_STATUS[reminder.status];
  return (
    <ListRow
      title={reminderLabel(reminder.daysBefore)}
      subtitle={formatDateTime(reminder.scheduledForUtc)}
      icon={reminder.channel === 'Email' ? Mail : Bell}
      trailing={<Badge label={status.label} tone={status.tone} />}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amount: { marginTop: spacing.lg },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm },
  note: { padding: spacing.lg },
  notesRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
