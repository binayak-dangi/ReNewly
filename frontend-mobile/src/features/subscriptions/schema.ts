import { z } from 'zod';
import type { BillingCycle, SaveSubscriptionRequest, Subscription, SubscriptionCategory } from '../../api/types';

const MAX_PRICE = 1_000_000;

/** Same rule as the API's PaymentLabelPolicy: a label with at most 4 digits, never a card number or CVV. */
export function isSafePaymentLabel(label: string): boolean {
  return (label.match(/\d/g) ?? []).length <= 4;
}

export const subscriptionFormSchema = z.object({
  serviceId: z.string().nullable(),
  serviceName: z.string().trim().min(1, 'Service name is required.').max(100, 'Keep it under 100 characters.'),
  planName: z.string().trim().max(100, 'Keep it under 100 characters.'),
  category: z.custom<SubscriptionCategory>(v => typeof v === 'string' && v.length > 0, 'Choose a category.'),
  price: z
    .string()
    .trim()
    .min(1, 'Enter the amount you are charged.')
    .refine(v => /^\d+([.,]\d{1,2})?$/.test(v), 'Enter an amount like 15.99.')
    .refine(v => Number(v.replace(',', '.')) <= MAX_PRICE, 'That amount looks too large.'),
  currency: z.string().length(3, 'Choose a currency.'),
  billingCycle: z.custom<BillingCycle>(v => typeof v === 'string', 'Choose how often you are billed.'),
  nextRenewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the next renewal date.'),
  reminderDaysBefore: z.array(z.number()),
  pushReminderEnabled: z.boolean(),
  emailReminderEnabled: z.boolean(),
  paymentMethodLabel: z
    .string()
    .trim()
    .max(40, 'Keep it under 40 characters.')
    .refine(isSafePaymentLabel, 'For your security, enter only a label and the last 4 digits (e.g. "Visa ****4521").'),
  notes: z.string().trim().max(1000, 'Keep notes under 1000 characters.'),
});

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;

export function toRequest(values: SubscriptionFormValues): SaveSubscriptionRequest {
  const blankToNull = (v: string) => (v.trim() ? v.trim() : null);
  return {
    serviceId: values.serviceId,
    serviceName: values.serviceName.trim(),
    planName: blankToNull(values.planName),
    category: values.category,
    price: Number(values.price.replace(',', '.')),
    currency: values.currency,
    billingCycle: values.billingCycle,
    nextRenewalDate: values.nextRenewalDate,
    reminderDaysBefore: values.reminderDaysBefore,
    pushReminderEnabled: values.pushReminderEnabled,
    emailReminderEnabled: values.emailReminderEnabled,
    paymentMethodLabel: blankToNull(values.paymentMethodLabel),
    notes: blankToNull(values.notes),
  };
}

export function fromSubscription(s: Subscription): SubscriptionFormValues {
  return {
    serviceId: s.serviceId,
    serviceName: s.serviceName,
    planName: s.planName ?? '',
    category: s.category,
    price: s.price.toFixed(2),
    currency: s.currency,
    billingCycle: s.billingCycle,
    nextRenewalDate: s.nextRenewalDate,
    reminderDaysBefore: s.reminderDaysBefore,
    pushReminderEnabled: s.pushReminderEnabled,
    emailReminderEnabled: s.emailReminderEnabled,
    paymentMethodLabel: s.paymentMethodLabel ?? '',
    notes: s.notes ?? '',
  };
}
