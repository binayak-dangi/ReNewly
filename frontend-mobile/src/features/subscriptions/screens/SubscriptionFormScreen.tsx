import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { ErrorCodes, toApiError } from '../../../api/errors';
import type { SubscriptionCategory } from '../../../api/types';
import { goBackOrHome } from '../../../app/navigation/goBack';
import type { RootScreenProps } from '../../../app/navigation/types';
import {
  AppText,
  Button,
  Card,
  Chip,
  ChipGroup,
  DateField,
  Divider,
  ErrorState,
  FormMessage,
  FormTextField,
  LoadingState,
  Screen,
  SelectField,
  ServiceAvatar,
  SwitchRow,
  toast,
} from '../../../components';
import { Bell, CreditCard, Mail, StickyNote } from '../../../components/icons';
import { useAuthStore } from '../../../store/authStore';
import { spacing } from '../../../theme';
import { applyApiErrors } from '../../../utils/forms';
import { useCatalogService, useMeta, useMyPlan, useNotificationDefaults, useSaveSubscription, useSubscription } from '../hooks';
import { BILLING_CYCLE_OPTIONS, CATEGORY_LABELS, REMINDER_DAY_OPTIONS, reminderLabel } from '../labels';
import { SubscriptionFormValues, fromSubscription, subscriptionFormSchema, toRequest } from '../schema';

const FALLBACK_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'NPR', 'AUD', 'CAD', 'JPY'];
const FIELDS = [
  'serviceName',
  'planName',
  'category',
  'price',
  'currency',
  'billingCycle',
  'nextRenewalDate',
  'reminderDaysBefore',
  'paymentMethodLabel',
  'notes',
] as const;

export function SubscriptionFormScreen({ navigation, route }: RootScreenProps<'SubscriptionForm'>) {
  const { id, serviceId, serviceName: typedName } = route.params ?? {};
  const isEdit = !!id;
  const user = useAuthStore(s => s.user);

  const existing = useSubscription(id);
  const catalogService = useCatalogService(isEdit ? undefined : serviceId);
  const plan = useMyPlan();
  const meta = useMeta();
  const notificationDefaults = useNotificationDefaults();
  const save = useSaveSubscription(id);
  const [formError, setFormError] = useState<string | null>(null);

  const maxReminders = plan.data?.entitlements.maxRemindersPerSubscription ?? 1;
  const emailAllowed = plan.data?.entitlements.emailReminders ?? false;

  const { control, handleSubmit, reset, setError, setValue, watch } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      serviceId: null,
      serviceName: typedName ?? '',
      planName: '',
      category: 'Other',
      price: '',
      currency: user?.preferredCurrency ?? 'USD',
      billingCycle: 'Monthly',
      nextRenewalDate: '',
      reminderDaysBefore: [3],
      pushReminderEnabled: true,
      emailReminderEnabled: false,
      paymentMethodLabel: '',
      notes: '',
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit subscription' : 'Add subscription' });
  }, [navigation, isEdit]);

  // Edit: load the saved values once.
  useEffect(() => {
    if (existing.data) {
      reset(fromSubscription(existing.data.subscription));
    }
  }, [existing.data, reset]);

  // Add from catalog: pre-fill name and category.
  useEffect(() => {
    if (catalogService.data) {
      setValue('serviceId', catalogService.data.id);
      setValue('serviceName', catalogService.data.name);
      setValue('category', catalogService.data.category);
    }
  }, [catalogService.data, setValue]);

  // New subscriptions start with the user's default reminders, trimmed to what the plan allows.
  useEffect(() => {
    if (!isEdit && notificationDefaults.data) {
      setValue('reminderDaysBefore', notificationDefaults.data.defaultReminderDaysBefore.slice(0, maxReminders));
    }
  }, [isEdit, notificationDefaults.data, maxReminders, setValue]);

  const serviceName = watch('serviceName');
  const reminderDays = watch('reminderDaysBefore');
  const linkedServiceId = watch('serviceId');
  const brandColor = catalogService.data?.brandColor ?? existing.data?.subscription.brandColor ?? null;
  const suggestedPlans = catalogService.data?.suggestedPlans ?? [];

  const currencyOptions = useMemo(
    () => (meta.data?.currencies ?? FALLBACK_CURRENCIES).map(code => ({ value: code, label: code })),
    [meta.data],
  );
  const categoryOptions = useMemo(
    () =>
      (meta.data?.categories ?? Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))).map(o => ({
        value: o.value,
        label: o.label,
      })),
    [meta.data],
  );

  const upsell = (message: string) =>
    Alert.alert('Renewly Pro', message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'See Pro', onPress: () => navigation.navigate('Premium') },
    ]);

  const toggleReminder = (day: number) => {
    const current = reminderDays ?? [];
    if (current.includes(day)) {
      setValue('reminderDaysBefore', current.filter(d => d !== day), { shouldDirty: true });
    } else if (current.length < maxReminders) {
      setValue('reminderDaysBefore', [...current, day].sort((a, b) => b - a), { shouldDirty: true });
    } else if (maxReminders === 1) {
      setValue('reminderDaysBefore', [day], { shouldDirty: true }); // Free: behaves like a single choice
    } else {
      upsell(`You can set up to ${maxReminders} reminders per subscription.`);
    }
  };

  const submit = () => {
    handleSubmit(values => {
      setFormError(null);
      save.mutate(toRequest(values), {
        onSuccess: detail => {
          toast.success(isEdit ? 'Changes saved.' : `${detail.subscription.serviceName} added.`);
          if (isEdit) {
            goBackOrHome(navigation);
          } else {
            navigation.replace('SubscriptionDetail', { id: detail.subscription.id });
          }
        },
        onError: error => {
          const apiError = toApiError(error);
          if (apiError.code === ErrorCodes.PlanLimitReached || apiError.code === ErrorCodes.ProFeatureRequired) {
            upsell(apiError.message);
            return;
          }
          setFormError(applyApiErrors(error, setError, FIELDS));
        },
      });
    })();
  };

  if (isEdit && existing.isPending) {
    return <LoadingState message="Loading subscription…" />;
  }
  if (isEdit && !existing.data) {
    return <ErrorState error={existing.error} onRetry={() => existing.refetch()} />;
  }

  const today = new Date();
  const minDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const maxDate = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      keyboardAware
      footer={<Button title={isEdit ? 'Save changes' : 'Add subscription'} onPress={submit} loading={save.isPending} />}>
      <FormMessage message={formError} />

      {linkedServiceId && serviceName ? (
        <View style={styles.serviceHeader}>
          <ServiceAvatar name={serviceName} brandColor={brandColor} size={48} />
          <View style={styles.flex}>
            <AppText variant="headline">{serviceName}</AppText>
            <AppText variant="caption" tone="muted">
              Official cancellation guidance available
            </AppText>
          </View>
        </View>
      ) : (
        <FormTextField control={control} name="serviceName" label="Service" placeholder="e.g. Netflix, Gym, iCloud" autoCapitalize="words" />
      )}

      <View style={styles.group}>
        <FormTextField control={control} name="planName" label="Plan (optional)" placeholder="e.g. Standard, Family" autoCapitalize="words" />
        {suggestedPlans.length > 0 ? (
          <View style={styles.chips}>
            {suggestedPlans.map(p => (
              <Chip key={p} label={p} selected={watch('planName') === p} onPress={() => setValue('planName', p, { shouldDirty: true })} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.row}>
        <View style={styles.amount}>
          <FormTextField control={control} name="price" label="Amount" placeholder="0.00" keyboardType="decimal-pad" />
        </View>
        <View style={styles.currency}>
          <Controller
            control={control}
            name="currency"
            render={({ field, fieldState }) => (
              <SelectField label="Currency" value={field.value} options={currencyOptions} onChange={field.onChange} error={fieldState.error?.message} searchable />
            )}
          />
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="label" tone="secondary">
          Billed
        </AppText>
        <Controller
          control={control}
          name="billingCycle"
          render={({ field }) => <ChipGroup options={BILLING_CYCLE_OPTIONS} value={field.value} onChange={field.onChange} accessibilityLabel="Billing cycle" />}
        />
      </View>

      <Controller
        control={control}
        name="nextRenewalDate"
        render={({ field, fieldState }) => (
          <DateField
            label="Next renewal date"
            value={field.value}
            onChange={field.onChange}
            minimumDate={minDate}
            maximumDate={maxDate}
            error={fieldState.error?.message}
            hint="Check your provider's account page or last receipt."
          />
        )}
      />

      {!linkedServiceId ? (
        <Controller
          control={control}
          name="category"
          render={({ field, fieldState }) => (
            <SelectField label="Category" value={field.value} options={categoryOptions} onChange={v => field.onChange(v as SubscriptionCategory)} error={fieldState.error?.message} />
          )}
        />
      ) : null}

      <View style={styles.group}>
        <AppText variant="headline">Reminders</AppText>
        <AppText variant="caption" tone="muted">
          {maxReminders > 1
            ? `Choose up to ${maxReminders} reminders.`
            : 'Free plan: 1 reminder per subscription. Pro adds up to 3 and email.'}
        </AppText>
        <View style={styles.chips}>
          {REMINDER_DAY_OPTIONS.map(day => (
            <Chip key={day} label={reminderLabel(day)} selected={reminderDays?.includes(day)} onPress={() => toggleReminder(day)} />
          ))}
        </View>
        <Card padding="none">
          <Controller
            control={control}
            name="pushReminderEnabled"
            render={({ field }) => (
              <SwitchRow title="Push notification" description="On this phone" icon={Bell} value={field.value} onValueChange={field.onChange} />
            )}
          />
          <Divider inset={spacing.lg} />
          <Controller
            control={control}
            name="emailReminderEnabled"
            render={({ field }) => (
              <SwitchRow
                title="Email"
                description={user?.email}
                icon={Mail}
                value={field.value}
                onValueChange={field.onChange}
                locked={!emailAllowed}
                onLockedPress={() => upsell('Email reminders are included with Renewly Pro.')}
              />
            )}
          />
        </Card>
      </View>

      <FormTextField
        control={control}
        name="paymentMethodLabel"
        label="Payment method (optional)"
        icon={CreditCard}
        placeholder='e.g. "Visa ****4521" or "PayPal"'
        hint="A label only. Never enter a full card number, CVV or PIN."
        maxLength={40}
      />

      <FormTextField control={control} name="notes" label="Notes (optional)" icon={StickyNote} multiline maxLength={1000} placeholder="Anything worth remembering" />

      <AppText variant="caption" tone="muted" align="center" style={styles.footnote}>
        Renewly only reminds you. It never charges, renews or cancels anything on your behalf.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  amount: { flex: 3 },
  currency: { flex: 2 },
  footnote: { marginTop: spacing.sm, marginBottom: spacing.sm },
});
