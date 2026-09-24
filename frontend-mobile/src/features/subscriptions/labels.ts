import type { BillingCycle, SubscriptionCategory } from '../../api/types';

/** Fallback labels (the server's /meta list is preferred when loaded). */
export const CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  Entertainment: 'Entertainment',
  Music: 'Music',
  Productivity: 'Productivity',
  AiTools: 'AI tools',
  Shopping: 'Shopping',
  CloudStorage: 'Cloud storage',
  Education: 'Education',
  News: 'News',
  Fitness: 'Fitness',
  Gaming: 'Gaming',
  Utilities: 'Utilities',
  Design: 'Design',
  Finance: 'Finance',
  Other: 'Other',
};

export const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Every 3 months' },
  { value: 'SemiAnnually', label: 'Every 6 months' },
  { value: 'Yearly', label: 'Yearly' },
];

export const REMINDER_DAY_OPTIONS = [7, 3, 1] as const;

export function reminderLabel(days: number): string {
  return days === 1 ? '1 day before' : `${days} days before`;
}

export const categoryLabel = (category: SubscriptionCategory) => CATEGORY_LABELS[category] ?? category;
