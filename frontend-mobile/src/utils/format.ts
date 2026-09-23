import { format, isValid, parseISO } from 'date-fns';
import type { BillingCycle, IsoDate, Money } from '../api/types';

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** "$15.99", "€9.50", "NPR 1,200.00". Falls back to "CODE 0.00" if Intl lacks the currency. */
export function formatMoney(amount: number, currency: string): string {
  try {
    let formatter = moneyFormatters.get(currency);
    if (!formatter) {
      formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' });
      moneyFormatters.set(currency, formatter);
    }
    return formatter.format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Per-currency totals joined for display: "$59.56 + NPR 1,200.00". Zero totals are dropped unless all are zero. */
export function formatMoneyList(totals: Money[]): string {
  const nonZero = totals.filter(t => t.amount !== 0);
  const shown = nonZero.length > 0 ? nonZero : totals.slice(0, 1);
  return shown.map(t => formatMoney(t.amount, t.currency)).join(' + ');
}

const CYCLE_SUFFIX: Record<BillingCycle, string> = {
  Weekly: '/ week',
  Monthly: '/ month',
  Quarterly: '/ 3 months',
  SemiAnnually: '/ 6 months',
  Yearly: '/ year',
};

const CYCLE_LABEL: Record<BillingCycle, string> = {
  Weekly: 'Weekly',
  Monthly: 'Monthly',
  Quarterly: 'Every 3 months',
  SemiAnnually: 'Every 6 months',
  Yearly: 'Yearly',
};

/** "$15.99 / month" */
export function formatPrice(amount: number, currency: string, cycle: BillingCycle): string {
  return `${formatMoney(amount, currency)} ${CYCLE_SUFFIX[cycle]}`;
}

export function billingCycleLabel(cycle: BillingCycle): string {
  return CYCLE_LABEL[cycle];
}

/** "Renews today" / "Renews tomorrow" / "Renews in 8 days" */
export function renewalCountdown(daysRemaining: number): string {
  if (daysRemaining <= 0) {
    return 'Renews today';
  }
  if (daysRemaining === 1) {
    return 'Renews tomorrow';
  }
  return `Renews in ${daysRemaining} days`;
}

/** Parses a yyyy-MM-dd date as a local calendar date (no time-zone shift). */
export function parseIsoDate(value: IsoDate): Date {
  return parseISO(value);
}

export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd');
}

/** "Sep 25, 2026" (or a custom date-fns pattern). */
export function formatDate(value: IsoDate | Date, pattern = 'MMM d, yyyy'): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? format(date, pattern) : '';
}

/** "Sep 23, 2026 · 9:00 AM" for UTC timestamps, shown in the device's local time. */
export function formatDateTime(isoUtc: string): string {
  const date = new Date(isoUtc);
  return Number.isNaN(date.getTime()) ? '' : format(date, "MMM d, yyyy '·' h:mm a");
}

/** Initials for avatars: "YouTube Premium" → "YP", "netflix" → "N". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  const letters = words.length === 1 ? words[0][0] : `${words[0][0]}${words[1][0]}`;
  return letters.toUpperCase();
}
