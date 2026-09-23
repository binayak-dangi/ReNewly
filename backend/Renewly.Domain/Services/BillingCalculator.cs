using Renewly.Domain.Enums;

namespace Renewly.Domain.Services;

/// <summary>Pure date and money calculations for billing cycles.</summary>
public static class BillingCalculator
{
    private const int WeeksPerYear = 52;

    /// <summary>
    /// Returns the first renewal date on or after <paramref name="today"/> in the series that
    /// starts at <paramref name="anchor"/>. Month-based cycles are computed from the anchor so that
    /// a renewal on the 31st returns to the 31st after a short month (Jan 31 → Feb 28 → Mar 31).
    /// </summary>
    public static DateOnly NextRenewalOnOrAfter(DateOnly anchor, BillingCycle cycle, DateOnly today)
    {
        if (anchor >= today)
        {
            return anchor;
        }

        if (cycle == BillingCycle.Weekly)
        {
            var daysBehind = today.DayNumber - anchor.DayNumber;
            var weeks = (daysBehind + 6) / 7;
            return anchor.AddDays(weeks * 7);
        }

        var months = MonthsPerCycle(cycle);
        var monthsBehind = ((today.Year - anchor.Year) * 12) + today.Month - anchor.Month;
        var periods = Math.Max(1, monthsBehind / months);
        var candidate = anchor.AddMonths(periods * months);
        while (candidate < today)
        {
            periods++;
            candidate = anchor.AddMonths(periods * months);
        }

        return candidate;
    }

    /// <summary>Returns the renewal date immediately after <paramref name="current"/>.</summary>
    public static DateOnly NextAfter(DateOnly current, BillingCycle cycle) =>
        cycle == BillingCycle.Weekly ? current.AddDays(7) : current.AddMonths(MonthsPerCycle(cycle));

    /// <summary>Normalises a price to an equivalent monthly amount (unrounded).</summary>
    public static decimal ToMonthlyAmount(decimal price, BillingCycle cycle) => cycle switch
    {
        BillingCycle.Weekly => price * WeeksPerYear / 12m,
        BillingCycle.Monthly => price,
        BillingCycle.Quarterly => price / 3m,
        BillingCycle.SemiAnnually => price / 6m,
        BillingCycle.Yearly => price / 12m,
        _ => throw new ArgumentOutOfRangeException(nameof(cycle), cycle, "Unknown billing cycle."),
    };

    /// <summary>Normalises a price to an equivalent yearly amount (unrounded).</summary>
    public static decimal ToYearlyAmount(decimal price, BillingCycle cycle) => cycle switch
    {
        BillingCycle.Weekly => price * WeeksPerYear,
        BillingCycle.Monthly => price * 12m,
        BillingCycle.Quarterly => price * 4m,
        BillingCycle.SemiAnnually => price * 2m,
        BillingCycle.Yearly => price,
        _ => throw new ArgumentOutOfRangeException(nameof(cycle), cycle, "Unknown billing cycle."),
    };

    public static decimal RoundMoney(decimal amount) => Math.Round(amount, 2, MidpointRounding.AwayFromZero);

    private static int MonthsPerCycle(BillingCycle cycle) => cycle switch
    {
        BillingCycle.Monthly => 1,
        BillingCycle.Quarterly => 3,
        BillingCycle.SemiAnnually => 6,
        BillingCycle.Yearly => 12,
        _ => throw new ArgumentOutOfRangeException(nameof(cycle), cycle, "Not a month-based cycle."),
    };
}
