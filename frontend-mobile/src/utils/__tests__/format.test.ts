import {
  formatDate,
  formatMoney,
  formatMoneyList,
  formatPrice,
  initials,
  parseIsoDate,
  renewalCountdown,
  toIsoDate,
} from '../format';

describe('format', () => {
  it('formats money with currency symbols', () => {
    expect(formatMoney(15.99, 'USD')).toBe('$15.99');
    expect(formatMoney(9.5, 'EUR')).toBe('€9.50');
    expect(formatMoney(1200, 'NPR')).toMatch(/1,200\.00/);
  });

  it('formats a price with its billing cycle', () => {
    expect(formatPrice(15.99, 'USD', 'Monthly')).toBe('$15.99 / month');
    expect(formatPrice(139, 'USD', 'Yearly')).toBe('$139.00 / year');
  });

  it('joins per-currency totals and hides zero amounts', () => {
    expect(
      formatMoneyList([
        { amount: 59.56, currency: 'USD' },
        { amount: 0, currency: 'EUR' },
        { amount: 1200, currency: 'NPR' },
      ]),
    ).toMatch(/^\$59\.56 \+ .*1,200\.00$/);
    expect(formatMoneyList([{ amount: 0, currency: 'USD' }])).toBe('$0.00');
  });

  it('describes the renewal countdown', () => {
    expect(renewalCountdown(0)).toBe('Renews today');
    expect(renewalCountdown(1)).toBe('Renews tomorrow');
    expect(renewalCountdown(8)).toBe('Renews in 8 days');
  });

  it('treats yyyy-MM-dd as a local calendar date', () => {
    const date = parseIsoDate('2026-09-25');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(25);
    expect(toIsoDate(date)).toBe('2026-09-25');
    expect(formatDate('2026-09-25')).toBe('Sep 25, 2026');
    expect(formatDate('not-a-date')).toBe('');
  });

  it('builds avatar initials', () => {
    expect(initials('YouTube Premium')).toBe('YP');
    expect(initials('netflix')).toBe('N');
    expect(initials('  ')).toBe('?');
  });
});
