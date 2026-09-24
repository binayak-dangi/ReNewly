import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { meApi } from '../../../api/endpoints';
import { errorMessage } from '../../../api/errors';
import { queryKeys } from '../../../api/queryKeys';
import type { NotificationSettings } from '../../../api/types';
import { goBackOrHome } from '../../../app/navigation/goBack';
import type { RootScreenProps } from '../../../app/navigation/types';
import {
  AppText,
  Button,
  Card,
  Chip,
  Divider,
  ErrorState,
  FormMessage,
  LoadingState,
  Screen,
  SectionHeader,
  SelectField,
  SwitchRow,
  toast,
} from '../../../components';
import { Bell, Mail, Sparkles } from '../../../components/icons';
import { useAuthStore } from '../../../store/authStore';
import { spacing } from '../../../theme';
import { useMyPlan } from '../../subscriptions/hooks';
import { REMINDER_DAY_OPTIONS, reminderLabel } from '../../subscriptions/labels';
import { useUpdateNotificationSettings } from '../hooks';
import { reminderTimeOptions } from '../options';

export function NotificationSettingsScreen({ navigation }: RootScreenProps<'NotificationSettings'>) {
  const user = useAuthStore(s => s.user);
  const settings = useQuery({ queryKey: queryKeys.notificationSettings, queryFn: meApi.getNotificationSettings });
  const plan = useMyPlan();
  const update = useUpdateNotificationSettings();
  const [draft, setDraft] = useState<NotificationSettings | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data && !draft) {
      setDraft(settings.data);
    }
  }, [settings.data, draft]);

  const times = useMemo(() => reminderTimeOptions(), []);
  const maxReminders = plan.data?.entitlements.maxRemindersPerSubscription ?? 1;
  const emailAllowed = plan.data?.entitlements.emailReminders ?? false;

  if (settings.isPending || !draft) {
    return settings.error ? <ErrorState error={settings.error} onRetry={() => settings.refetch()} /> : <LoadingState />;
  }

  const set = (changes: Partial<NotificationSettings>) => setDraft(d => (d ? { ...d, ...changes } : d));
  const upsell = (message: string) =>
    Alert.alert('Renewly Pro', message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'See Pro', onPress: () => navigation.navigate('Premium') },
    ]);

  const toggleDay = (day: number) => {
    const days = draft.defaultReminderDaysBefore;
    if (days.includes(day)) {
      set({ defaultReminderDaysBefore: days.filter(d => d !== day) });
    } else if (days.length < maxReminders) {
      set({ defaultReminderDaysBefore: [...days, day].sort((a, b) => b - a) });
    } else if (maxReminders === 1) {
      set({ defaultReminderDaysBefore: [day] });
    } else {
      upsell(`You can set up to ${maxReminders} reminders.`);
    }
  };

  const time = draft.reminderTimeOfDay.length === 5 ? `${draft.reminderTimeOfDay}:00` : draft.reminderTimeOfDay;
  const timeOptions = times.some(t => t.value === time) ? times : [{ value: time, label: time.slice(0, 5) }, ...times];
  const changed = JSON.stringify(draft) !== JSON.stringify(settings.data);

  const save = () => {
    setFormError(null);
    update.mutate(draft, {
      onSuccess: () => {
        toast.success('Notification settings saved. Reminders have been rescheduled.');
        goBackOrHome(navigation);
      },
      onError: e => setFormError(errorMessage(e)),
    });
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} footer={<Button title="Save" onPress={save} loading={update.isPending} disabled={!changed} />}>
      <FormMessage message={formError} />

      <SectionHeader title="Channels" />
      <Card padding="none">
        <SwitchRow
          title="Push notifications"
          description="Reminders on this phone"
          icon={Bell}
          value={draft.pushEnabled}
          onValueChange={pushEnabled => set({ pushEnabled })}
        />
        <Divider inset={spacing.lg} />
        <SwitchRow
          title="Email reminders"
          description={user?.email}
          icon={Mail}
          value={draft.emailEnabled}
          onValueChange={emailEnabled => set({ emailEnabled })}
          locked={!emailAllowed}
          onLockedPress={() => upsell('Email reminders are included with Renewly Pro.')}
        />
      </Card>
      {!draft.pushEnabled && !draft.emailEnabled ? (
        <FormMessage message="With every channel off you won't get any renewal reminders." />
      ) : null}

      <SectionHeader title="Default reminders" />
      <View style={styles.group}>
        <AppText variant="caption" tone="muted">
          Applied to new subscriptions. {maxReminders > 1 ? `Up to ${maxReminders}.` : 'Free plan: 1 reminder. Pro adds up to 3.'}
        </AppText>
        <View style={styles.chips}>
          {REMINDER_DAY_OPTIONS.map(day => (
            <Chip key={day} label={reminderLabel(day)} selected={draft.defaultReminderDaysBefore.includes(day)} onPress={() => toggleDay(day)} />
          ))}
        </View>
      </View>

      <SelectField label="Reminder time" value={time} options={timeOptions} onChange={reminderTimeOfDay => set({ reminderTimeOfDay })} />
      <AppText variant="caption" tone="muted">
        Reminders arrive at this time in your time zone ({user?.timeZoneId.replace(/_/g, ' ')}).
      </AppText>

      <SectionHeader title="Other" />
      <Card padding="none">
        <SwitchRow
          title="Product updates"
          description="Occasional emails about new Renewly features"
          icon={Sparkles}
          value={draft.productUpdatesEmailEnabled}
          onValueChange={productUpdatesEmailEnabled => set({ productUpdatesEmailEnabled })}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
